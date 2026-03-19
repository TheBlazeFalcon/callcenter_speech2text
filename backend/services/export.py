import os
import json
import pandas as pd
from typing import Dict

def flatten_dict(d, parent_key='', sep='_'):
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)

class ExportService:
    def __init__(self, outputs_dir: str = "outputs"):
        self.outputs_dir = outputs_dir

    def process_notations(self, data: Dict) -> pd.DataFrame:
        rows = []
        project = data.get("project", "Unknown")
        for section in ["idea", "team", "pilot"]:
            if section in data:
                row = {"Project": project, "Section": section.capitalize()}
                row.update(flatten_dict(data.get(section, {}).get("criteria", {})))
                row["Potential Score"] = data.get(section, {}).get(f"{section}_potential")
                rows.append(row)
        return pd.DataFrame(rows)

    def process_qualitative(self, data: Dict) -> pd.DataFrame:
        project = data.get("project", "Unknown")
        flat_data = flatten_dict(data)
        flat_data["Project"] = project
        return pd.DataFrame([flat_data])

    def process_agent_assessment(self, data: Dict) -> pd.DataFrame:
        rows = []
        call_summary = data.get("call_summary", "")
        final_verdict = data.get("final_verdict", "")
        performance = data.get("agent_performance", {})
        for criterion, score in performance.items():
            rows.append({
                "Criterion": criterion.replace('_', ' ').title(),
                "Score": score,
                "Final Verdict": final_verdict,
                "Call Summary": call_summary
            })
        return pd.DataFrame(rows)

    def process_quantitative(self, data: Dict) -> pd.DataFrame:
        quant = data.get("quantitative", {})
        if not quant:
            return pd.DataFrame()
        return pd.DataFrame([{k.replace('_', ' ').title(): v for k, v in quant.items()}])

    def process_qualitative_observations(self, data: Dict) -> pd.DataFrame:
        observations = data.get("qualitative_observations", [])
        if not observations:
            return pd.DataFrame()
        return pd.DataFrame([{"Tag": o.get("tag", ""), "Observation": o.get("text", "")} for o in observations])

    def _auto_width(self, writer, sheet_name: str):
        worksheet = writer.sheets[sheet_name]
        for col in worksheet.columns:
            max_length = 0
            column = col[0].column_letter
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            worksheet.column_dimensions[column].width = min(max_length + 2, 50)

    def export_to_excel(self, base_name: str) -> str:
        assessment_path = os.path.join(self.outputs_dir, f"{base_name}_assessment.json")
        output_path = os.path.join(self.outputs_dir, f"{base_name}_final_assessment.xlsx")

        if not os.path.exists(assessment_path):
            return output_path

        with open(assessment_path, 'r') as f:
            data = json.load(f)

        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            sheets = {
                "Agent Performance": self.process_agent_assessment(data),
                "Quantitative": self.process_quantitative(data),
                "Qualitative Observations": self.process_qualitative_observations(data),
            }
            for sheet_name, df in sheets.items():
                if not df.empty:
                    df.to_excel(writer, sheet_name=sheet_name, index=False)
                    self._auto_width(writer, sheet_name)

        return output_path
