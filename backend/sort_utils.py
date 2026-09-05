import re

def natural_sort_key(val):
    """
    Produces a sort key that orders alphanumeric strings naturally.
    For example:
      ['CS2023002', 'CS2023001', 'CS2023010'] -> sorted as:
      ['CS2023001', 'CS2023002', 'CS2023010']
    Using (0, int) for numbers and (1, str) for text guarantees Python 3
    can never compare an int directly against a str.
    """
    if val is None:
        return []
    s = str(val).strip()
    key = []
    for chunk in re.split(r'(\d+)', s):
        if not chunk:
            continue
        if chunk.isdigit():
            key.append((0, int(chunk)))
        else:
            key.append((1, chunk.lower()))
    return key
