#!/usr/bin/env python3
# /// script
# dependencies = [
#   "jinja2",
#   "rich",
#   "typer",
#   "pyyaml",
# ]
# ///

"""
Jinja2 SQL Template Processor

A script to analyze Jinja2 SQL templates and generate demo SQL with interactive variable input.
"""

import re
import sys
import json
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path

try:
    from jinja2 import Environment, meta, Template, TemplateSyntaxError
    from rich.console import Console
    from rich.panel import Panel
    from rich.table import Table
    from rich.prompt import Prompt, Confirm
    from rich.text import Text
    from rich.syntax import Syntax
    import typer
except ImportError as e:
    print(f"Missing required dependency: {e}")
    print("Please install required packages with:")
    print("uv add jinja2 rich typer pyyaml")
    sys.exit(1)

app = typer.Typer(help="Process Jinja2 SQL templates and generate demo SQL")
console = Console()


@dataclass
class VariableInfo:
    """Information about a Jinja2 variable"""
    name: str
    type: str
    description: str = ""
    default_value: Any = None
    source: str = "variable"  # variable, conditional, loop
    context: str = ""


@dataclass
class TemplateAnalysis:
    """Analysis result of a Jinja2 template"""
    variables: List[VariableInfo]
    has_conditionals: bool
    has_loops: bool
    raw_template: str
    syntax_errors: List[str]


class Jinja2SQLProcessor:
    """Process Jinja2 SQL templates with interactive variable input"""

    def __init__(self):
        self.env = Environment()
        self.variable_patterns = {
            'integer': r'\b(age|count|limit|offset|id|num|amount|total|quantity)\b',
            'string': r'\b(name|email|username|title|description|text|status|uuid)\b',
            'boolean': r'\b(is_|has_|can_|should_|will_|enabled|disabled|active|inactive)\b',
            'date': r'\b(date|time|created|updated|birth|start|end|begin|finish)\b'
        }

    def analyze_template(self, template_content: str) -> TemplateAnalysis:
        """Analyze a Jinja2 template and extract variable information"""
        variables = []
        syntax_errors = []

        try:
            # Parse template to find variables
            template_source = template_content
            ast = self.env.parse(template_source)

            # Find undefined variables
            undefined_vars = meta.find_undeclared_variables(ast)

            # Extract variables with context
            variables.extend(self._extract_variables_from_text(template_content, undefined_vars))

            # Analyze conditionals and loops
            has_conditionals = "{% if" in template_content or "{% elif" in template_content
            has_loops = "{% for" in template_content

            # Extract variables from conditionals
            if has_conditionals:
                conditional_vars = self._extract_conditional_variables(template_content)
                variables.extend(conditional_vars)

            # Remove duplicates
            seen = set()
            unique_variables = []
            for var in variables:
                if var.name not in seen:
                    seen.add(var.name)
                    unique_variables.append(var)

            return TemplateAnalysis(
                variables=unique_variables,
                has_conditionals=has_conditionals,
                has_loops=has_loops,
                raw_template=template_content,
                syntax_errors=syntax_errors
            )

        except TemplateSyntaxError as e:
            syntax_errors.append(f"Syntax error: {e.message} at line {e.lineno}")
            return TemplateAnalysis(
                variables=[],
                has_conditionals=False,
                has_loops=False,
                raw_template=template_content,
                syntax_errors=syntax_errors
            )

    def _extract_variables_from_text(self, text: str, known_vars: set) -> List[VariableInfo]:
        """Extract variables from template text"""
        variables = []

        # Find all {{ variable }} expressions
        pattern = r'\{\{\s*([^}]+?)\s*\}\}'
        matches = re.finditer(pattern, text)

        for match in matches:
            expression = match.group(1).strip()

            # Handle complex expressions like user.name or variable|filter
            base_var = self._extract_base_variable(expression)

            if base_var and (not known_vars or base_var in known_vars):
                var_type = self._infer_variable_type(base_var, text)
                variables.append(VariableInfo(
                    name=base_var,
                    type=var_type,
                    context=f"Expression: {expression}",
                    source="variable"
                ))

        return variables

    def _extract_conditional_variables(self, text: str) -> List[VariableInfo]:
        """Extract variables from conditional statements"""
        variables = []

        # Find {% if variable %} patterns
        pattern = r'\{%\s*if\s+([^%]+?)\s*%\}'
        matches = re.finditer(pattern, text)

        for match in matches:
            condition = match.group(1).strip()

            # Extract variable names from conditions
            # Handle simple conditions like "variable", "variable is defined", etc.
            var_names = re.findall(r'\b([a-zA-Z_][a-zA-Z0-9_]*)\b', condition)

            for var_name in var_names:
                if var_name not in ['if', 'elif', 'else', 'endif', 'not', 'and', 'or', 'in', 'is', 'defined']:
                    var_type = self._infer_variable_type(var_name, text)
                    variables.append(VariableInfo(
                        name=var_name,
                        type=var_type,
                        context=f"Condition: {condition}",
                        source="conditional"
                    ))

        return variables

    def _extract_base_variable(self, expression: str) -> Optional[str]:
        """Extract base variable name from complex expression"""
        # Remove filters
        expr = expression.split('|')[0].strip()

        # Handle attribute access (user.name)
        base_var = expr.split('.')[0]

        # Handle dictionary access (user['name'])
        dict_match = re.match(r'([a-zA-Z_][a-zA-Z0-9_]*)\[', base_var)
        if dict_match:
            return dict_match.group(1)

        # Validate variable name
        if re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', base_var):
            return base_var

        return None

    def _infer_variable_type(self, var_name: str, context: str) -> str:
        """Infer variable type from name and context"""
        lower_name = var_name.lower()

        # Check patterns
        for var_type, pattern in self.variable_patterns.items():
            if re.search(pattern, lower_name):
                return var_type

        # Check context for additional clues
        if re.search(rf'\b{var_name}\s+IN\s*\(', context, re.IGNORECASE):
            return "list"

        if re.search(rf'\b{var_name}\s*(=|!=|>=|<=|>|<)', context, re.IGNORECASE):
            # Could be number or string depending on comparison
            if re.search(r'\d+', context):
                return "integer"
            else:
                return "string"

        return "string"  # Default to string

    def get_user_input_for_variables(self, variables: List[VariableInfo]) -> Dict[str, Any]:
        """Get user input for variables with rich UI"""
        values = {}

        console.print(Panel.fit(
            "[bold blue]Variable Input[/bold blue]\n"
            "Please provide values for the variables found in the template.",
            title="Jinja2 SQL Processor"
        ))

        for var in variables:
            # Show variable info
            var_info = Table(show_header=False, box=None)
            var_info.add_column("Property", style="cyan")
            var_info.add_column("Value", style="white")

            var_info.add_row("Name", f"[bold]{var.name}[/bold]")
            var_info.add_row("Type", var.type)
            var_info.add_row("Source", var.source)
            if var.context:
                var_info.add_row("Context", var.context)

            console.print(var_info)

            # Get appropriate input based on type
            default_value = self._get_default_value(var)

            if var.type == "boolean":
                value = Confirm.ask(f"Value for {var.name}?", default=default_value)
            elif var.type == "integer":
                value = Prompt.ask(
                    f"Value for {var.name}",
                    default=str(default_value)
                )
                try:
                    value = int(value)
                except ValueError:
                    console.print(f"[red]Invalid integer, using default: {default_value}[/red]")
                    value = default_value
            elif var.type == "date":
                value = Prompt.ask(
                    f"Value for {var.name}",
                    default=str(default_value)
                )
            else:  # string or unknown
                value = Prompt.ask(
                    f"Value for {var.name}",
                    default=str(default_value)
                )
                # Add quotes for SQL
                if value and not (value.startswith("'") and value.endswith("'")):
                    value = f"'{value}'"

            values[var.name] = value
            console.print()

        return values

    def _get_default_value(self, var: VariableInfo) -> Any:
        """Get default value for variable based on type"""
        if var.default_value is not None:
            return var.default_value

        defaults = {
            "integer": 42,
            "string": "'demo_value'",
            "boolean": True,
            "date": "'2024-01-01'",
            "list": "'1,2,3'"
        }

        return defaults.get(var.type, "'demo_value'")

    def render_template(self, template_content: str, variables: Dict[str, Any]) -> str:
        """Render Jinja2 template with provided variables"""
        try:
            template = self.env.from_string(template_content)
            result = template.render(**variables)
            return result
        except Exception as e:
            console.print(f"[red]Error rendering template: {e}[/red]")
            return template_content

    def format_sql_output(self, sql: str) -> str:
        """Format SQL for better readability"""
        # Basic SQL formatting
        lines = sql.split('\n')
        formatted_lines = []

        for line in lines:
            # Remove empty lines that are just whitespace
            if line.strip():
                formatted_lines.append(line)

        return '\n'.join(formatted_lines)

    def process_template_interactive(self, template_content: str) -> Optional[str]:
        """Process template interactively and return rendered SQL"""
        console.print("[bold green]Analyzing Jinja2 SQL Template...[/bold green]\n")

        # Analyze template
        analysis = self.analyze_template(template_content)

        if analysis.syntax_errors:
            console.print("[red]Template Syntax Errors:[/red]")
            for error in analysis.syntax_errors:
                console.print(f"  • {error}")
            return None

        # Show analysis summary
        summary = Table(title="Template Analysis", show_header=True)
        summary.add_column("Property", style="cyan")
        summary.add_column("Value", style="white")

        summary.add_row("Variables", str(len(analysis.variables)))
        summary.add_row("Conditionals", "Yes" if analysis.has_conditionals else "No")
        summary.add_row("Loops", "Yes" if analysis.has_loops else "No")

        console.print(summary)
        console.print()

        # Show variables
        if analysis.variables:
            var_table = Table(title="Variables Found", show_header=True)
            var_table.add_column("Name", style="cyan")
            var_table.add_column("Type", style="green")
            var_table.add_column("Source", style="yellow")

            for var in analysis.variables:
                var_table.add_row(var.name, var.type, var.source)

            console.print(var_table)
            console.print()

        # Get user input
        values = self.get_user_input_for_variables(analysis.variables)

        # Render template
        console.print("[bold green]Rendering SQL...[/bold green]")
        rendered_sql = self.render_template(template_content, values)
        formatted_sql = self.format_sql_output(rendered_sql)

        # Show result
        console.print(Panel.fit(
            Syntax(formatted_sql, "sql", theme="monokai", line_numbers=True),
            title="[bold green]Generated SQL[/bold green]",
            border_style="green"
        ))

        # Ask if user wants to copy to clipboard
        if Confirm.ask("\nCopy to clipboard?"):
            try:
                import pyperclip
                pyperclip.copy(formatted_sql)
                console.print("[green]✓ Copied to clipboard[/green]")
            except ImportError:
                console.print("[yellow]pyperclip not available. Install with: uv add pyperclip[/yellow]")

        return formatted_sql


@app.command()
def process_file(
    file_path: str = typer.Argument(..., help="Path to Jinja2 SQL template file"),
    output: Optional[str] = typer.Option(None, "--output", "-o", help="Output file for generated SQL"),
    variables_file: Optional[str] = typer.Option(None, "--vars", "-v", help="JSON file with variable values"),
    quiet: bool = typer.Option(False, "--quiet", "-q", help="Non-interactive mode")
):
    """Process a Jinja2 SQL template file"""

    processor = Jinja2SQLProcessor()

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
    except FileNotFoundError:
        console.print(f"[red]Error: File not found: {file_path}[/red]")
        raise typer.Exit(1)
    except Exception as e:
        console.print(f"[red]Error reading file: {e}[/red]")
        raise typer.Exit(1)

    if quiet and variables_file:
        # Non-interactive mode with predefined variables
        try:
            with open(variables_file, 'r') as f:
                variables = json.load(f)
        except Exception as e:
            console.print(f"[red]Error reading variables file: {e}[/red]")
            raise typer.Exit(1)

        rendered_sql = processor.render_template(template_content, variables)
        formatted_sql = processor.format_sql_output(rendered_sql)

        if output:
            with open(output, 'w') as f:
                f.write(formatted_sql)
            console.print(f"[green]SQL saved to {output}[/green]")
        else:
            console.print(Syntax(formatted_sql, "sql", theme="monokai", line_numbers=True))
    else:
        # Interactive mode
        result = processor.process_template_interactive(template_content)

        if result and output:
            with open(output, 'w') as f:
                f.write(result)
            console.print(f"[green]SQL also saved to {output}[/green]")


@app.command()
def process_stdin():
    """Process Jinja2 template from stdin"""
    processor = Jinja2SQLProcessor()

    # Read template from stdin
    template_content = sys.stdin.read()

    if not template_content.strip():
        console.print("[red]No template content provided[/red]")
        raise typer.Exit(1)

    result = processor.process_template_interactive(template_content)


@app.command()
def analyze_template_file(
    file_path: str = typer.Argument(..., help="Path to Jinja2 SQL template file")
):
    """Analyze template without rendering"""

    processor = Jinja2SQLProcessor()

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
    except Exception as e:
        console.print(f"[red]Error reading file: {e}[/red]")
        raise typer.Exit(1)

    analysis = processor.analyze_template(template_content)

    # Show analysis
    console.print(Panel.fit(
        f"Template: {file_path}",
        title="Template Analysis"
    ))

    console.print(f"Variables: {len(analysis.variables)}")
    console.print(f"Conditionals: {analysis.has_conditionals}")
    console.print(f"Loops: {analysis.has_loops}")
    console.print(f"Syntax Errors: {len(analysis.syntax_errors)}")

    if analysis.syntax_errors:
        console.print("\n[red]Syntax Errors:[/red]")
        for error in analysis.syntax_errors:
            console.print(f"  • {error}")

    if analysis.variables:
        console.print("\n[cyan]Variables:[/cyan]")
        for var in analysis.variables:
            console.print(f"  • {var.name} ({var.type}) - {var.source}")


if __name__ == "__main__":
    app()