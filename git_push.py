import subprocess

try:
    # First add all changes
    subprocess.run(["git", "add", "."], check=True)
    print("Added changes.")
    
    # Commit changes
    subprocess.run(["git", "commit", "-m", "Convert demo to fully functional app"], check=True)
    print("Committed changes.")
except subprocess.CalledProcessError as e:
    print(f"Error during add/commit: {e}")

try:
    # Push changes
    subprocess.run(["git", "push"], check=True)
    print("Pushed changes.")
except subprocess.CalledProcessError as e:
    print(f"Error during push: {e}")
