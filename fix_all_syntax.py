import re

with open('server/routes.ts', 'r') as f:
    content = f.read()

# Find all lines with the JSON.stringify corruption pattern
lines = content.split('\n')
fixed_lines = []

for i, line in enumerate(lines):
    # Fix pattern: console.log(`${JSON.stringify(`text`)} ${JSON.stringify(text`)}`);
    if 'console.log(`${JSON.stringify(' in line:
        # Extract the parts and reconstruct properly
        if ')} ${JSON.stringify(' in line:
            # Complex pattern with two JSON.stringify calls
            match = re.search(r'console\.log\(`\$\{JSON\.stringify\(`([^`]+)`\)\} \$\{JSON\.stringify\(([^)]+)\)\}`\);', line)
            if match:
                text1 = match.group(1)
                text2 = match.group(2).replace('`)}', '').replace('`', '')
                line = f'      console.log(`{text1} {text2}`);'
        else:
            # Simple pattern with one JSON.stringify
            match = re.search(r'console\.log\(`\$\{JSON\.stringify\(`([^`]+)`\)\}`\);', line)
            if match:
                text = match.group(1)
                line = f'      console.log(`{text}`);'
    
    # Fix other corrupted patterns
    line = re.sub(r'\$\{JSON\.stringify\(`([^`]+)`\)\}', r'\1', line)
    line = re.sub(r'\$\{JSON\.stringify\(([^)]+)\)\}', r'\1', line)
    
    fixed_lines.append(line)

with open('server/routes.ts', 'w') as f:
    f.write('\n'.join(fixed_lines))

print("Fixed all syntax errors")
