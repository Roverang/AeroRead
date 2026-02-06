import fitz  # PyMuPDF
import io

def process_pdf(file_content: bytes):
    """
    Extracts text from PDF and splits it into manageable 'Chapters' 
    (usually by page or block).
    """
    doc = fitz.open(stream=file_content, filetype="pdf")
    chapters = []
    total_words = 0

    # For PDFs, we treat each page as a 'Chapter' for the RSVP engine
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text()
        words = [w for w in text.split() if w]
        
        if len(words) > 10:
            word_count = len(words)
            total_words += word_count
            chapters.append({
                "title": f"Page {page_num + 1}",
                "content": words,
                "word_count": word_count
            })

    return chapters, total_words