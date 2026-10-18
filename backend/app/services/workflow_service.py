from typing import Dict, List, Set
from fastapi import HTTPException, status

ALLOWED_STANDARD_TRANSITIONS: Dict[str, Set[str]] = {
    "open": {"in_progress"},
    "in_progress": {"blocked", "resolved"},
    "blocked": {"in_progress"},
    "resolved": {"closed", "in_progress"},
    "closed": set(),  # Terminal for ordinary users
}


class WorkflowService:
    @staticmethod
    def get_allowed_next_statuses(current_status: str, is_admin: bool = False) -> List[str]:
        """Return the list of statuses the current status can transition to."""
        allowed = set(ALLOWED_STANDARD_TRANSITIONS.get(current_status, set()))
        if is_admin and current_status == "closed":
            # Administrator is permitted to reopen closed tasks
            allowed.add("in_progress")
            allowed.add("open")
        return sorted(list(allowed))

    @staticmethod
    def validate_transition(current_status: str, new_status: str, is_admin: bool = False) -> None:
        """
        Validate whether a status transition is permitted.
        Raises HTTPException(400) if the transition is forbidden.
        """
        if current_status == new_status:
            return  # No-op status change

        allowed_next = WorkflowService.get_allowed_next_statuses(current_status, is_admin=is_admin)

        if new_status not in allowed_next:
            if current_status == "closed" and not is_admin:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "error": "InvalidStatusTransition",
                        "message": "Closed tasks are terminal and can only be reopened by an Administrator.",
                        "current_status": current_status,
                        "target_status": new_status,
                        "allowed_statuses": allowed_next,
                    }
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "InvalidStatusTransition",
                    "message": f"Cannot transition task from '{current_status}' to '{new_status}'. Allowed transitions: {allowed_next or 'None'}.",
                    "current_status": current_status,
                    "target_status": new_status,
                    "allowed_statuses": allowed_next,
                }
            )
