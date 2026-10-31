from fastapi import APIRouter

from app.schemas import SimplifiedTerm, SimplifyRequest, SimplifyResponse
from app.simplifier import default_simplifier

router = APIRouter(prefix="/simplify", tags=["simplify"])


@router.post("")
def simplify_text(payload: SimplifyRequest) -> SimplifyResponse:
    """Swap medical jargon in `text` for everyday words, and list each term that was changed.

    Public: no login needed.
    """
    simplified, replacements = default_simplifier().simplify(payload.text)
    return SimplifyResponse(
        simplified=simplified, terms=[SimplifiedTerm.model_validate(r) for r in replacements]
    )
