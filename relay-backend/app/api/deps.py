from app.core.auth import get_current_user, AuthUser
from app.repositories import ContactRepository, TemplateRepository, CallRepository

__all__ = ['get_current_user', 'AuthUser']

def get_contact_repo() -> ContactRepository:
    return ContactRepository()

def get_call_repo() -> CallRepository:
    return CallRepository()

def get_template_repo() -> TemplateRepository:
    return TemplateRepository()



