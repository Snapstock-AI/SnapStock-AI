from pathlib import Path

DATASET_PATH = Path(
    "data/raw/fruits-fresh-and-rotten-for-classification/dataset"
)

for split in ["train", "test"]:
    print(f"\n{split.upper()}")

    split_path = DATASET_PATH / split

    for folder in sorted(split_path.iterdir()):
        if folder.is_dir():
            count = len(list(folder.glob("*")))
            print(f"{folder.name}: {count}")