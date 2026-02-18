{
  "task": "Transcription",
  "language_rules": {
    "moroccan_darija": "Arabic Script",
    "french_english": "Latin Script",
    "script_switching": "Inline/Mid-sentence based on speech",
    "verbatim": true
  },
  "formatting": {
    "type": "structured_list",
    "pattern": "[MM:SS] Speaker ID: Text",
    "speakers": {
      "A": "Speaker A",
      "B": "Speaker B"
    }
  },
  "constraints": [
    "Do not translate",
    "Do not normalize to Modern Standard Arabic",
    "Maintain exact dialectal spelling for Darija in Arabic script",
    "Maintain French/English terms in Latin script",
    "Keep all fillers and mid-sentence script changes"
  ]
}