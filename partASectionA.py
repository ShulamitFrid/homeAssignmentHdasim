from collections import Counter
from typing import List, Tuple


def find_most_common_errors(file_name: str, n: int, lines_in_chunk: int = 10000) -> List[Tuple[str, int]]:
    """
    Finds the N most frequent error codes in a large log file.

    This function reads the given log file in chunks to avoid memory overload,
    counts the occurrences of each error code per chunk, and merges the counts to
    determine the most common error codes overall.

    Args:
        file_name (str): Path to the log file containing millions of log lines.
        n (int): Number of most common error codes to return.
        lines_in_chunk (int): Number of lines to read per chunk (default is 10,000).

    Returns:
        List[Tuple[str, int]]: A list of tuples containing the N most common error codes
                               and their frequencies, sorted from most to least frequent.
    """
    errors_count = Counter()

    with open(file_name, "r", encoding="utf-8") as file:
        while True:
            # Read the next chunk of lines
            chunk = [file.readline() for _ in range(lines_in_chunk)]
            chunk = list(filter(None, chunk))

            # End of file
            if not chunk:
                break

            # Count the frequency of each error code in the current chunk
            chunk_count = Counter()

            for line in chunk:
                if "Error:" in line:
                    parts = line.split("Error:")
                    code_error = parts[1].strip().strip().strip('"\'')   # Clean surrounding quotes
                    chunk_count[code_error] += 1

            # Update the global error counts with this chunk's counts
            errors_count.update(chunk_count)

    # Return the N most common error codes from the merged counts
    return errors_count.most_common(n)


# Example usage:
if __name__ == "__main__":
    N = 5
    top_errors = find_most_common_errors("logs.txt", N)
    for code, count in top_errors:
        print(f"{code}: {count}")


"""
Runtime analysis:

M = number of lines in the file.

N = number of most common errors to return.

Each line is processed once - O(M).

Extracting top-N errors uses a heap - O(M log N).

Overall: O(M) + O(M log N) = O(M log N)
"""