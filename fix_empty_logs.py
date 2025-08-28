import re

with open('server/routes.ts', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'console.log()' in line:
        # Replace empty console.log() with a contextual message
        if i > 0:
            # Look at the previous line for context
            prev_line = lines[i-1]
            if 'Found' in prev_line or 'Created' in prev_line or 'Updated' in prev_line:
                lines[i] = line.replace('console.log()', 'console.log("Operation completed successfully")')
            elif 'error' in prev_line.lower() or 'fail' in prev_line.lower():
                lines[i] = line.replace('console.log()', 'console.log("Error logged")')
            else:
                lines[i] = line.replace('console.log()', 'console.log("Processing...")')
        else:
            lines[i] = line.replace('console.log()', 'console.log("Processing...")')

with open('server/routes.ts', 'w') as f:
    f.writelines(lines)

print(f"Fixed all empty console.log() statements")
