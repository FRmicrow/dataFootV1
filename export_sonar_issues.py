import requests
import csv
import os

token = "squ_be8a389062712516545f65de85cd999f30feec73"
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

if __name__ == "__main__":
    issues = fetch_issues()
    output_file = "/Users/dominiqueparsis/statFootV3/sonar_issues_report_v3.csv"
    export_to_csv(issues, output_file)
