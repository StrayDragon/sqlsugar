#!/usr/bin/env python3
# /// script
# dependencies = [
#   "jinja2",
#   "pyyaml",
# ]
# ///

"""
Simple Jinja2 SQL Template Processor for VS Code integration

Processes Jinja2 templates and generates demo SQL with minimal dependencies.
"""

import json
import sys
import re
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

try:
    from jinja2 import Environment, meta, Template, TemplateSyntaxError
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "jinja2 package not available. Install with: uv add jinja2"
    }))
    sys.exit(1)


@dataclass
class VariableInfo:
    """Information about a Jinja2 variable"""
    name: str
    type: str
    default_value: Any = None


@dataclass
class ProcessResult:
    """Result of template processing"""
    success: bool
    variables: List[VariableInfo]
    demo_sql: Optional[str] = None
    error: Optional[str] = None
    has_conditionals: bool = False
    has_loops: bool = False


class SimpleJinja2Processor:
    """Simple Jinja2 processor for VS Code integration"""

    def __init__(self):
        self.env = Environment()

    def analyze_template(self, template_content: str) -> ProcessResult:
        """Analyze Jinja2 template and return demo SQL"""
        try:
            # Parse template
            template_source = template_content
            ast = self.env.parse(template_source)

            # Find variables
            undefined_vars = meta.find_undeclared_variables(ast)
            variables = self._extract_variables(template_content, undefined_vars)

            # Check for conditionals and loops
            has_conditionals = "{% if" in template_content or "{% elif" in template_content
            has_loops = "{% for" in template_content

            # Generate demo values
            demo_values = self._generate_demo_values(variables)

            # Render demo SQL
            demo_sql = self._render_template(template_content, demo_values)

            return ProcessResult(
                success=True,
                variables=variables,
                demo_sql=demo_sql,
                has_conditionals=has_conditionals,
                has_loops=has_loops
            )

        except TemplateSyntaxError as e:
            return ProcessResult(
                success=False,
                variables=[],
                error=f"Template syntax error: {e.message} at line {e.lineno}"
            )
        except Exception as e:
            return ProcessResult(
                success=False,
                variables=[],
                error=f"Processing error: {str(e)}"
            )

    def _extract_variables(self, text: str, known_vars: set) -> List[VariableInfo]:
        """Extract variables from template text"""
        variables = []

        # Extract from {{ variable }} expressions
        pattern = r'\{\{\s*([^}]+?)\s*\}\}'
        matches = re.finditer(pattern, text)

        seen_vars = set()
        for match in matches:
            expression = match.group(1).strip()
            base_var = self._extract_base_variable(expression)

            if base_var and (not known_vars or base_var in known_vars):
                if base_var not in seen_vars:
                    seen_vars.add(base_var)
                    var_type = self._infer_variable_type(base_var, text)
                    default_value = self._get_default_value(var_type)
                    variables.append(VariableInfo(
                        name=base_var,
                        type=var_type,
                        default_value=default_value
                    ))

        # Extract from conditionals
        conditional_vars = self._extract_conditional_variables(text)
        for var_name in conditional_vars:
            if var_name not in seen_vars:
                seen_vars.add(var_name)
                var_type = self._infer_variable_type(var_name, text)
                default_value = self._get_default_value(var_type)
                variables.append(VariableInfo(
                    name=var_name,
                    type=var_type,
                    default_value=default_value
                ))

        return variables

    def _extract_conditional_variables(self, text: str) -> List[str]:
        """Extract variables from conditional statements"""
        variables = []
        pattern = r'\{%\s*if\s+([^%]+?)\s*%\}'
        matches = re.finditer(pattern, text)

        for match in matches:
            condition = match.group(1).strip()
            var_names = re.findall(r'\b([a-zA-Z_][a-zA-Z0-9_]*)\b', condition)

            for var_name in var_names:
                if var_name not in ['if', 'elif', 'else', 'endif', 'not', 'and', 'or', 'in', 'is', 'defined']:
                    variables.append(var_name)

        return variables

    def _extract_base_variable(self, expression: str) -> Optional[str]:
        """Extract base variable name from complex expression"""
        # Remove filters
        expr = expression.split('|')[0].strip()

        # Handle attribute access
        base_var = expr.split('.')[0]

        # Handle dictionary access
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

        # Type inference patterns
        patterns = {
            'integer': r'\b(age|count|limit|offset|id|num|amount|total|quantity|number)\b',
            'boolean': r'\b(is_|has_|can_|should_|will_|enabled|disabled|active|inactive)\b',
            'date': r'\b(date|time|created|updated|birth|start|end|begin|finish|datetime)\b',
            'string': r'\b(name|email|username|title|description|text|status|uuid|id)\b'
        }

        for var_type, pattern in patterns.items():
            if re.search(pattern, lower_name):
                return var_type

        return 'string'  # Default

    def _get_default_value(self, var_type: str) -> Any:
        """Get default value for variable type"""
        defaults = {
            'integer': 42,
            'string': "'demo_value'",
            'boolean': True,
            'date': "'2024-01-01'"
        }

        # Handle specific common patterns
        if var_type == 'integer':
            if 'limit' in var_type.lower():
                return 10
            elif 'offset' in var_type.lower():
                return 0

        return defaults.get(var_type, "'demo_value'")

    def _generate_demo_values(self, variables: List[VariableInfo]) -> Dict[str, Any]:
        """Generate demo values for variables"""
        return {var.name: var.default_value for var in variables}

    def _render_template(self, template_content: str, variables: Dict[str, Any]) -> str:
        """Render Jinja2 template with variables"""
        try:
            template = self.env.from_string(template_content)
            result = template.render(**variables)

            # Clean up empty lines and format
            lines = result.split('\n')
            cleaned_lines = []

            for line in lines:
                stripped = line.strip()
                # Remove Jinja2 comments and empty lines
                if stripped and not stripped.startswith('{#'):
                    cleaned_lines.append(line)

            return '\n'.join(cleaned_lines)

        except Exception as e:
            # If rendering fails, return the original template
            return template_content


def main():
    """Main function for command line usage"""
    parser = argparse.ArgumentParser(description='Process Jinja2 SQL templates')
    parser.add_argument('template', help='Jinja2 template content or file path')
    parser.add_argument('--file', '-f', action='store_true', help='Treat template as file path')
    parser.add_argument('--json', '-j', action='store_true', help='Output as JSON')
    parser.add_argument('--vars', '-v', help='JSON file with variable values')

    args = parser.parse_args()

    processor = SimpleJinja2Processor()

    # Get template content
    if args.file:
        try:
            with open(args.template, 'r', encoding='utf-8') as f:
                template_content = f.read()
        except Exception as e:
            result = ProcessResult(
                success=False,
                variables=[],
                error=f"File error: {str(e)}"
            )
        else:
            result = processor.analyze_template(template_content)
    else:
        result = processor.analyze_template(args.template)

    # Output result
    if args.json:
        output = {
            "success": result.success,
            "variables": [
                {
                    "name": var.name,
                    "type": var.type,
                    "default_value": var.default_value
                }
                for var in result.variables
            ],
            "demo_sql": result.demo_sql,
            "error": result.error,
            "has_conditionals": result.has_conditionals,
            "has_loops": result.has_loops
        }
        print(json.dumps(output, indent=2))
    else:
        if result.success:
            print(f"Found {len(result.variables)} variables:")
            for var in result.variables:
                print(f"  - {var.name} ({var.type}): {var.default_value}")
            print(f"\nConditionals: {result.has_conditionals}")
            print(f"Loops: {result.has_loops}")
            print("\nDemo SQL:")
            print(result.demo_sql or result.error)
        else:
            print(f"Error: {result.error}")


if __name__ == "__main__":
    main()