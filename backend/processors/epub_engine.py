import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup
import io
import re

def process_epub(file_content: bytes):
    """
    The 'Lithium' Shredder:
    1. Loads EPUB from memory.
    2. Filters for document items (text).
    3. Cleans HTML, leaving only pure text.
    4. Segments into chapters for the System.
    """
    # Load the EPUB from bytes
    f = io.BytesIO(file_content)
    book = epub.read_epub(f)
    
    chapters = []
    total_words = 0
    
    # Iterate through documents in the EPUB (usually XHTML files)
    for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
        # Parse HTML content
        content = item.get_content()
        soup = BeautifulSoup(content, 'html.parser')
        
        # 1. Clean the 'noise' (Styles, Scripts, Navbars)
        for junk in soup(['script', 'style', 'nav', 'header', 'footer']):
            junk.decompose()
            
        # 2. Extract Title (Look for h1, h2, or the item name)
        title_tag = soup.find(['h1', 'h2', 'h3'])
        chapter_title = title_tag.get_text().strip() if title_tag else item.get_name()
        
        # 3. Extract Text and Shred into Words
        # separator=' ' ensures words don't stick together after tag removal
        raw_text = soup.get_text(separator=' ')
        
        # Clean extra whitespace and split
        words = [word for word in raw_text.split() if word]
        
        # 4. Filter out 'Ghost' Chapters (like empty pages or just ads)
        if len(words) > 50:
            word_count = len(words)
            total_words += word_count
            
            chapters.append({
                "title": chapter_title,
                "content": words,
                "word_count": word_count
            })
            
    # Fallback if no chapters were found
    if not chapters:
        raise ValueError("The System could not detect any readable text in this EPUB.")
        
    return chapters, total_words