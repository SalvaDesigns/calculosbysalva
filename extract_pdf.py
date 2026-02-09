import pypdf
import os

pdf_path = r'c:\Users\salva\Desktop\IA APELES\Proyecto 4\Convenio Limpieza Santa Cruz de Tenerife 17-20.pdf'
output_path = 'convenio_extracted.txt'

try:
    reader = pypdf.PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f"Extraction successful. Saved to {output_path}")
except Exception as e:
    print(f"Error: {e}")
