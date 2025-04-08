import re
import pandas as pd
import os


def is_valid_date_time(date_str: str) -> bool:
    """
    Check if the input string is a valid datetime in the format 'YYYY-MM-DD HH:MM:SS'.

    Args:
        date_str (str): The datetime string to validate.

    Returns:
        bool: True if valid, False otherwise.
    """
    pattern = r"^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])\s+([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\s*$"
    return bool(re.match(pattern, date_str))


def is_numeric(val) -> bool:
    """
    Check if a value is numeric and can be converted to float.

    Args:
        val: Any value to check.

    Returns:
        bool: True if numeric, False otherwise.
    """
    if pd.isna(val): # Check if the value is NaN
        return False
    try:
        float(val) # Check if the value is NaN
        return True
    except ValueError:
        return False


def checks_before_process(file_name: str):
    """
    Perform initial checks on the dataset before processing:
    1. Validate 'timestamp' format (YYYY-MM-DD HH:MM:SS).
    2. Remove duplicate timestamps (keep first occurrence).
    3. Ensure 'value' is numeric - the check I added.

    Saves the cleaned dataset to a new Excel file prefixed with 'clean_'.

    Args:
        file_name (str): The input Excel file name.
    """
    data = pd.read_excel(file_name) # Load data from the Excel file

    seen_timestamps = set() # Set to keep track of already encountered timestamps
    valid_rows = [] # List to store valid rows

    for index, row in data.iterrows():
        timestamps = str(row['timestamp']).strip()
        value = row['value']

        # Perform validation checks for timestamp and value
        if is_valid_date_time(timestamps) and is_numeric(value) and timestamps not in seen_timestamps:
            seen_timestamps.add(timestamps)
            valid_rows.append(row)

    cleaned_data = pd.DataFrame(valid_rows)  # Convert the valid rows to a DataFrame

    cleaned_data.to_excel(f"clean_{file_name}", index=False) # Save the cleaned data to a new Excel file


def read_file(file_name: str) -> pd.DataFrame:
    """
   Load data from Excel or Parquet file into a DataFrame.

   Args:
       file_name (str): File to read.

   Returns:
       pd.DataFrame: Loaded data.

   Raises:
       ValueError: If the file format is unsupported.
   """
    if file_name.endswith('.xlsx') or file_name.endswith('.xls'):
        return pd.read_excel(file_name) # Load Excel file
    elif file_name.endswith('.parquet'):
        return pd.read_parquet(file_name) # Load Parquet file
    else:
        raise ValueError("Unsupported file format")


def average_per_hour(file_name: str, output_file_name: str):
    """
    Compute hourly averages from the dataset.

    - For Excel input: expects 'timestamp' and 'value' columns.
    - For Parquet input: expects 'timestamp', 'mean_value', and 'count'.

    Outputs a new Excel file with hourly averages.

    Args:
        file_name (str): Input file name (.xlsx or .parquet).
        output_file_name (str): Output Excel file name for results.
    """
    data = read_file(file_name) # Load data from the input file

    hourly_data = {} # Create a dictionary to store totals and counts for each hour, in order to calculate average = total/count later

    for index, row in data.iterrows():
        timestamp = pd.to_datetime(row['timestamp'])

        key = timestamp.replace(minute=0, second=0) # Create a key: YYYY-MM-DD HH:00:00

        # Handle different file formats (Excel or Parquet)
        if 'value' in data.columns:  # Excel case
            value = row['value']
            count = 1
        elif 'mean_value' in row and 'count' in row:  # Parquet case
            value = row['mean_value'] * row['count']
            count = row['count']
        else:
            continue  # skip rows that don't match expected formats

        # Update the total and count for the corresponding hour
        if key not in hourly_data:
            hourly_data[key] = [value, 1]
        else:
            hourly_data[key][0] += value
            hourly_data[key][1] += count

    result = [{'start_time': key, 'average': total / count} for key, (total, count) in hourly_data.items()] # Calculate the average for each hour

    # Save the results to the output file
    result = pd.DataFrame(result)
    result.to_excel(output_file_name, index=False)


def split_data_by_day(file_name: str, output_folder: str):
    """
    Split the dataset into separate files by day (based on 'timestamp' column).

    Args:
        file_name (str): Full path to the cleaned Excel or Parquet file.
        output_folder (str): Folder to store the daily files.
    """
    data = read_file(file_name) # Read the input file

    daily_data = {} # Dictionary to store rows for each day

    os.makedirs(output_folder, exist_ok=True)  # Create the output folder if it doesn't exist

    # Loop through the rows and sort them into days
    for index, row in data.iterrows():
        date = pd.to_datetime(row['timestamp']).date()  # Extract only the date part
        if date not in daily_data:
            daily_data[date] = []  # Create a new list for this date if it doesn't exist
        daily_data[date].append(row) # Add the row to the corresponding date

    _, ext = os.path.splitext(file_name) # splits the filename into its base name and extension.

    # Write each list of rows to a separate Excel file
    for date, rows in daily_data.items():
        file = pd.DataFrame(rows)
        out_path = f"{output_folder}/{date}.{ext}"
        if ext == ".parquet":
            file.to_parquet(out_path, index=False)
        else:
            file.to_excel(out_path, index=False)


def process_all_daily_files(output_folder: str):
    """
    Process each daily file in the specified folder to compute hourly averages.
    Combines all results into a final Excel file named 'final_average_per_hour.xlsx'.

    Args:
        output_folder (str): Folder containing daily files.
    """
    all_results = [] # List to store the results from all daily files
    temp_file = "daily_average_per_hour.xlsx" # Temporary file for intermediate results

    # Loop through all files in the output folder
    for file_name in os.listdir(output_folder):
        if file_name.endswith(".xlsx"):
            full_path = os.path.join(output_folder, file_name) # Get the full path of each file
            average_per_hour(full_path, temp_file) # Calculate hourly averages for each daily file

            # Read the daily results (writen to "average_per_hour.xlsx" in average_per_hour function) and add them to the combined list
            daily_result = pd.read_excel("average_per_hour.xlsx")
            all_results.append(daily_result)

    os.remove(temp_file) # Remove the temporary file

    # Combine all the results and save them to a final file
    all_results = pd.concat(all_results)
    all_results.to_excel("final_average_per_hour.xlsx", index=False)


def main():
    # Clean and validate the raw data
    checks_before_process("time_series.xlsx")

    # Calculate hourly averages on cleaned data
    average_per_hour("clean_time_series.xlsx", "average_per_hour.xlsx")

    # Split the cleaned file by day and process each daily file
    split_data_by_day("clean_time_series.xlsx", "daily_parts")

    # Process each daily file and merge the hourly averages
    process_all_daily_files("daily_parts")

    # Calculate hourly averages on parquet file
    average_per_hour("time_series (4).parquet", "average_per_hour.xlsx")

    # Split the parquet file by day and process each daily file
    split_data_by_day("time_series (4).parquet", "daily_parts")

    # Process each daily file and merge the hourly averages
    process_all_daily_files("daily_parts")


if __name__ == "__main__":
    main()

"""
Benefits of storing data in parquet format:
    - Good for storing big data of any kind (structured data tables, images, videos, documents).
    - Saves on cloud storage space by using highly efficient column-wise compression, and flexible encoding schemes for columns with different data types.
    - Increased data throughput and performance using techniques like data skipping, whereby queries that fetch specific column values need not read the entire row of data.
"""