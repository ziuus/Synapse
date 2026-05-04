import json
from duckduckgo_search import DDGS

def search_internet(query: str, max_results: int = 5):
    """
    Performs a live web search to gather real-time data.
    """
    results = []
    try:
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results):
                results.append({
                    "title": r.get("title"),
                    "link": r.get("href"),
                    "body": r.get("body")
                })
        return results
    except Exception as e:
        return [{"error": str(e)}]

def format_search_results(results):
    if not results or "error" in results[0]:
        return "No search results found or error occurred."
    
    formatted = "### SEARCH RESULTS:\n"
    for i, r in enumerate(results):
        formatted += f"{i+1}. **{r['title']}**\n   {r['body']}\n   Source: {r['link']}\n\n"
    return formatted
