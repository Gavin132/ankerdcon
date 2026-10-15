"""Make the event covers that are already uploaded lighter (max 1600 px, WebP).

From the backend folder (or inside the backend container):

    python -m scripts.shrink_event_covers --dry-run      # only say what would shrink
    python -m scripts.shrink_event_covers                # do it; old files stay
    python -m scripts.shrink_event_covers --delete-old   # do it and remove the old files

Safe to run again: a cover that is light enough is left alone.
"""
import sys

from app.services.cover_shrink import shrink_covers

if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    shrunk = shrink_covers(dry_run=dry, delete_old=("--delete-old" in sys.argv))
    for s in shrunk:
        print(f"{s['event']}: {s['before'] / 1024:.0f} kB -> {s['after'] / 1024:.0f} kB")
    print(f"{'Would shrink' if dry else 'Shrunk'} {len(shrunk)} cover(s).")
