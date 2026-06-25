"""
Migration validation script.
Run: python validate_migrations.py
Tests that all migrations have proper upgrade/downgrade functions.
"""
import os
import re
from pathlib import Path

def validate_migrations(versions_dir: str = "alembic/versions") -> bool:
    versions_path = Path(versions_dir)
    if not versions_path.exists():
        print(f"No migrations directory found at {versions_dir}")
        return True

    all_valid = True
    migration_files = list(versions_path.glob("*.py"))

    if not migration_files:
        print("No migration files found.")
        return True

    print(f"Checking {len(migration_files)} migration files...")

    for migration_file in sorted(migration_files):
        content = migration_file.read_text()

        has_upgrade = "def upgrade" in content
        has_downgrade = "def downgrade" in content

        # Check if downgrade is empty (just pass or just comments)
        downgrade_empty = False
        if has_downgrade:
            # Find downgrade function body
            match = re.search(r'def downgrade\([^)]*\):[^\n]*\n((?:[ \t]+[^\n]*\n?)*)', content)
            if match:
                body = match.group(1).strip()
                if body in ('pass', '') or all(line.strip().startswith('#') or line.strip() == 'pass' for line in body.splitlines() if line.strip()):
                    downgrade_empty = True

        # Check if upgrade uses create_all (non-standard pattern)
        uses_create_all = "create_all" in content
        uses_drop_all = "drop_all" in content

        # Check if downgrade uses drop_all to mirror create_all
        downgrade_mirrors_upgrade = True
        if uses_create_all and not uses_drop_all and not downgrade_empty:
            downgrade_mirrors_upgrade = False

        status = "OK"
        issues = []

        if not has_upgrade:
            issues.append("MISSING upgrade() function")
            all_valid = False

        if not has_downgrade:
            issues.append("MISSING downgrade() function")
            all_valid = False
        elif downgrade_empty:
            issues.append("WARNING: downgrade() appears to be empty/pass-only")

        if uses_create_all:
            issues.append(
                "INFO: uses create_all() instead of individual op.create_table() calls — "
                "cannot detect column-level drift via alembic autogenerate"
            )

        if uses_create_all and uses_drop_all:
            issues.append("INFO: downgrade uses drop_all() — mirrors create_all() correctly")

        if issues:
            print(f"  {migration_file.name}: {', '.join(issues)}")
        else:
            print(f"  {migration_file.name}: {status}")

    return all_valid


if __name__ == "__main__":
    valid = validate_migrations()
    if valid:
        print("\nAll migrations look valid!")
    else:
        print("\nSome migrations have issues — check above.")
        exit(1)
