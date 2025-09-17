#!/usr/bin/env python3
# /// script
# dependencies = [
#   "jinja2",
#   "pyyaml",
# ]
# ///

"""
Jinja2 Template Renderer for VS Code integration

Renders Jinja2 templates with provided variable values.
"""

import json
import sys
import argparse
from pathlib import Path
from dataclasses import dataclass

try:
    from jinja2 import Environment, Template, TemplateSyntaxError
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "jinja2 package not available. Install with: uv add jinja2"
    }))
    sys.exit(1)


@dataclass
class RenderResult:
    """Result of template rendering"""
    success: bool
    sql: str = ""
    error: str = ""


class Jinja2TemplateRenderer:
    """Jinja2 template renderer for VS Code integration"""

    def __init__(self):
        self.env = Environment()

    def render_template(self, template_content: str, variables: dict) -> RenderResult:
        """Render Jinja2 template with provided variables"""
        try:
            # Create and render template
            template = self.env.from_string(template_content)
            result = template.render(**variables)

            # Clean up empty lines and format
            lines = result.split('\n')
            cleaned_lines = []

            for line in lines:
                stripped = line.strip()
                # Remove empty lines but preserve formatting
                if stripped or line.strip() == '':
                    cleaned_lines.append(line)

            final_sql = '\n'.join(cleaned_lines)

            return RenderResult(
                success=True,
                sql=final_sql
            )

        except TemplateSyntaxError as e:
            return RenderResult(
                success=False,
                error=f"Template syntax error: {e.message} at line {e.lineno}"
            )
        except Exception as e:
            return RenderResult(
                success=False,
                error=f"Rendering error: {str(e)}"
            )


def main():
    """Main function for command line usage"""
    parser = argparse.ArgumentParser(description='Render Jinja2 SQL templates')
    parser.add_argument('--json', '-j', action='store_true', help='Output as JSON')

    args = parser.parse_args()

    # Read input from stdin
    input_data = json.loads(sys.stdin.read())

    template_content = input_data.get('template', '')
    variables = input_data.get('variables', {})

    renderer = Jinja2TemplateRenderer()
    result = renderer.render_template(template_content, variables)

    # Output result
    if args.json:
        output = {
            "success": result.success,
            "sql": result.sql,
            "error": result.error
        }
        print(json.dumps(output, indent=2))
    else:
        if result.success:
            print("Rendered SQL:")
            print(result.sql)
        else:
            print(f"Error: {result.error}")


if __name__ == "__main__":
    main()