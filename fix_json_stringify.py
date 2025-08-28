import re

with open('server/routes.ts', 'r') as f:
    content = f.read()

# Pattern to match the corrupted console.log statements
pattern = r'console\.log\(`\$\{JSON\.stringify\([^)]*\)\}[^`]*`\);'

def fix_console_log(match):
    # Extract the content and simplify it
    text = match.group(0)
    # Remove JSON.stringify and clean up the syntax
    text = re.sub(r'\$\{JSON\.stringify\(', '', text)
    text = re.sub(r'\)\}', '', text) 
    # Fix any remaining issues
    text = re.sub(r'`([^`]+)`\)\}[^`]*`', r'`\1`', text)
    return text

# Apply fixes
fixed_content = re.sub(pattern, fix_console_log, content)

# Additional specific fixes
fixed_content = re.sub(
    r'console\.log\(`\$\{JSON\.stringify\(`([^`]+)`\)\} \$\{JSON\.stringify\(([^)]+)\)`\)\}`\);',
    r'console.log(`\1 \2`);',
    fixed_content
)

with open('server/routes.ts', 'w') as f:
    f.write(fixed_content)

print("Fixed all JSON.stringify errors")
