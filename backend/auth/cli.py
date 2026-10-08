from __future__ import annotations

import argparse
import getpass
import sys

from . import service, store


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m auth.cli", description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    create = sub.add_parser("create-user", help="add a user (you will be asked for the password)")
    create.add_argument("username")
    create.add_argument("--role", choices=store.ROLES, default="viewer")
    args = parser.parse_args(argv)

    password = getpass.getpass(f"Password for {args.username} (min {service.MIN_PASSWORD_LENGTH} characters): ")
    if password != getpass.getpass("Repeat password: "):
        print("Passwords do not match.", file=sys.stderr)
        return 1
    store.init_db()
    try:
        user = service.create_user(args.username, password, args.role)
    except (ValueError, store.UserExists) as exc:
        print(f"Could not create user: {exc if isinstance(exc, ValueError) else 'that username already exists'}", file=sys.stderr)
        return 1
    print(f"Created {user.role} '{user.username}'.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
