import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# Set test environment
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app.database import Base, get_db
from app.main import app
from app.models.user import User, TeamMembership
from app.models.team import Team
from app.models.task import Task
from app.services.auth_service import AuthService

TEST_ENGINE = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=TEST_ENGINE)
    yield
    Base.metadata.drop_all(bind=TEST_ENGINE)


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    connection = TEST_ENGINE.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def auth_helpers(db_session: Session):
    class AuthHelpers:
        @staticmethod
        def create_user(email: str, full_name: str, role: str = "user", password: str = "Password123!") -> User:
            user = User(
                email=email,
                hashed_password=AuthService.hash_password(password),
                full_name=full_name,
                global_role=role,
                is_active=True
            )
            db_session.add(user)
            db_session.commit()
            db_session.refresh(user)
            return user

        @staticmethod
        def create_team(name: str) -> Team:
            team = Team(name=name, description=f"{name} description")
            db_session.add(team)
            db_session.commit()
            db_session.refresh(team)
            return team

        @staticmethod
        def add_membership(user: User, team: Team, role: str = "member") -> TeamMembership:
            m = TeamMembership(user_id=user.id, team_id=team.id, role=role)
            db_session.add(m)
            db_session.commit()
            db_session.refresh(m)
            return m

        @staticmethod
        def get_auth_headers(user: User) -> dict:
            token = AuthService.create_session_token(user.id)
            csrf = AuthService.generate_csrf_token(user.id)
            return {
                "Authorization": f"Bearer {token}",
                "X-CSRF-Token": csrf
            }

    return AuthHelpers
