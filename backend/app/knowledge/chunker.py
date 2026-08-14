from typing import Tuple


def estimate_token_count(text: str) -> int:
    """Estimates token count for a text string."""
    words = text.strip().split()
    return max(1, int(len(words) * 1.25))


class TextChunker:
    """
    Sliding window text chunker with paragraph and sentence preservation.
    """

    def __init__(self, max_tokens: int = 512, overlap_tokens: int = 64):
        self.max_tokens = max_tokens
        self.overlap_tokens = overlap_tokens

    def chunk_text(self, text: str) -> list[tuple[str, int]]:
        text = text.strip()
        if not text:
            return []

        total_tokens = estimate_token_count(text)
        if total_tokens <= self.max_tokens:
            return [(text, total_tokens)]

        # Split into paragraphs first
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        chunks: list[tuple[str, int]] = []
        current_chunk_words: list[str] = []
        current_token_count = 0

        for para in paragraphs:
            para_words = para.split()
            para_tokens = estimate_token_count(para)

            if current_token_count + para_tokens <= self.max_tokens:
                current_chunk_words.extend(para_words)
                current_token_count += para_tokens
            else:
                if current_chunk_words:
                    chunk_text = " ".join(current_chunk_words)
                    chunks.append((chunk_text, estimate_token_count(chunk_text)))

                    # Retain overlap words
                    overlap_word_count = max(1, int(self.overlap_tokens * 0.8))
                    overlap_words = current_chunk_words[-overlap_word_count:]
                    current_chunk_words = overlap_words + para_words
                    current_token_count = estimate_token_count(" ".join(current_chunk_words))
                else:
                    # Paragraph is longer than max_tokens: split by words
                    current_chunk_words = para_words
                    current_token_count = para_tokens

        if current_chunk_words:
            chunk_text = " ".join(current_chunk_words)
            chunks.append((chunk_text, estimate_token_count(chunk_text)))

        return chunks
