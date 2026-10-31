"""Make the thumbnail and preview of every story photo that does not have them yet.

Run once after migration v2.41, from the backend folder (or inside the backend container):

    python -m scripts.backfill_story_previews            # all of them
    python -m scripts.backfill_story_previews 20         # at most 20, to try it

Safe to run again: it only touches photos without a thumbnail.
"""
import sys

from app.services.story_previews import backfill

if __name__ == "__main__":
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else None
    made, skipped, failed = backfill(limit)
    print(f"Made {made}, skipped {skipped} (nothing to make them from), failed {failed}.")
    if failed:
        print("See the log for why; run it again to retry the failed ones.")
        sys.exit(1)
