import requests
import csv
import os
import pandas as pd

token = "squ_bd6c174593674898db3fe56369dc2b36372b0bcf"
project_key = "FRmicrow_dataFootV1"
base_url = "http://localhost:9000/api/issues/search"

def fetch_issues():
    issues = []
    p = 1
    while True:
        try:
            response = requests.get(
                base_url,
                params={
                    "componentKeys": project_key,
                    "ps": 500,
                    "p": p,
                    "statuses": "OPEN,REOPENED,CONFIRMED"
                },
                auth=(token, ""),
                timeout=30
            )
            data = response.json()
            issues.extend(data.get("issues", []))
            
            p += 1
            if p * 500 > data.get("paging", {}).get("total", 0) + 500:
                break
        except Exception as e:
            print(f"Error fetching page {p}: {e}")
            break
            
    return issues

def export_to_csv(issues, filename):
    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["key", "severity", "type", "component", "line", "message", "status", "author", "creationDate"])
        
        for issue in issues:
            writer.writerow([
                issue.get("key"),
                issue.get("severity"),
                issue.get("type"),
                issue.get("component"),
                issue.get("line"),
                issue.get("message"),
                issue.get("status"),
                issue.get("author"),
                issue.get("creationDate")
            ])

def export_to_xlsx(issues, filename):
    df = pd.DataFrame(issues)
    if not df.empty:
        # Keep only relevant columns if they exist
        cols = ["key", "severity", "type", "component", "line", "message", "status", "author", "creationDate"]
        df = df[[c for c in cols if c in df.columns]]
    df.to_excel(filename, index=False)

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        token = sys.argv[1]
    
    version = "v10"
    if len(sys.argv) > 2:
        version = sys.argv[2]
        
    issues = fetch_issues()
    csv_file = f"sonar_issues_report_{version}.csv"
    xlsx_file = f"sonar_issues_report_{version}.xlsx"
    
    export_to_csv(issues, csv_file)
    print(f"Exported to {csv_file}")
    
    export_to_xlsx(issues, xlsx_file)
    print(f"Exported to {xlsx_file}")
