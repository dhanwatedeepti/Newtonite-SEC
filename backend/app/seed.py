import json
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.database import SessionLocal, Base, engine
from app.models.user import User, TeamMembership
from app.models.team import Team
from app.models.task import Task
from app.models.audit import AuditEvent
from app.services.auth_service import AuthService


def seed_database():
    db: Session = SessionLocal()
    try:
        # Check if already seeded
        if db.query(User).filter(User.email == "admin@newtonite.com").first():
            print("Database already contains seed users. Skipping seed.")
            return

        print("Seeding database with demo teams, users, and tasks...")
        now = datetime.now(timezone.utc)
        default_pwd_hash = AuthService.hash_password("Password123!")

        # 1. Create Teams
        team_ops = Team(id=str(uuid.uuid4()), name="Operations", description="Operational workflows, logistics, and incident response", created_at=now, updated_at=now)
        team_eng = Team(id=str(uuid.uuid4()), name="Engineering", description="Core platform, infrastructure, and backend services", created_at=now, updated_at=now)
        team_support = Team(id=str(uuid.uuid4()), name="Customer Support", description="Customer inquiries, escalations, and issue resolution", created_at=now, updated_at=now)
        team_comp = Team(id=str(uuid.uuid4()), name="Compliance & Risk", description="Regulatory compliance, security audits, and risk management", created_at=now, updated_at=now)

        db.add_all([team_ops, team_eng, team_support, team_comp])
        db.flush()

        # 2. Create Users
        admin_user = User(
            id=str(uuid.uuid4()),
            email="admin@newtonite.com",
            hashed_password=default_pwd_hash,
            full_name="Sarah Administrator",
            global_role="admin",
            is_active=True,
            created_at=now,
            updated_at=now
        )
        lead_ops = User(
            id=str(uuid.uuid4()),
            email="lead.ops@newtonite.com",
            hashed_password=default_pwd_hash,
            full_name="David Chen (Ops Lead)",
            global_role="user",
            is_active=True,
            created_at=now,
            updated_at=now
        )
        lead_eng = User(
            id=str(uuid.uuid4()),
            email="lead.eng@newtonite.com",
            hashed_password=default_pwd_hash,
            full_name="Elena Rostova (Eng Lead)",
            global_role="user",
            is_active=True,
            created_at=now,
            updated_at=now
        )
        member_ops = User(
            id=str(uuid.uuid4()),
            email="member.ops@newtonite.com",
            hashed_password=default_pwd_hash,
            full_name="Marcus Vance (Ops Member)",
            global_role="user",
            is_active=True,
            created_at=now,
            updated_at=now
        )
        member_eng = User(
            id=str(uuid.uuid4()),
            email="member.eng@newtonite.com",
            hashed_password=default_pwd_hash,
            full_name="Priya Sharma (Eng Member)",
            global_role="user",
            is_active=True,
            created_at=now,
            updated_at=now
        )
        member_multi = User(
            id=str(uuid.uuid4()),
            email="member.multi@newtonite.com",
            hashed_password=default_pwd_hash,
            full_name="Alex Rivera (Cross-Team Member)",
            global_role="user",
            is_active=True,
            created_at=now,
            updated_at=now
        )

        db.add_all([admin_user, lead_ops, lead_eng, member_ops, member_eng, member_multi])
        db.flush()

        # 3. Create Team Memberships
        memberships = [
            # Ops team
            TeamMembership(id=str(uuid.uuid4()), user_id=lead_ops.id, team_id=team_ops.id, role="team_lead", created_at=now),
            TeamMembership(id=str(uuid.uuid4()), user_id=member_ops.id, team_id=team_ops.id, role="member", created_at=now),
            TeamMembership(id=str(uuid.uuid4()), user_id=member_multi.id, team_id=team_ops.id, role="member", created_at=now),

            # Eng team
            TeamMembership(id=str(uuid.uuid4()), user_id=lead_eng.id, team_id=team_eng.id, role="team_lead", created_at=now),
            TeamMembership(id=str(uuid.uuid4()), user_id=member_eng.id, team_id=team_eng.id, role="member", created_at=now),
            TeamMembership(id=str(uuid.uuid4()), user_id=member_multi.id, team_id=team_eng.id, role="member", created_at=now),

            # Support team
            TeamMembership(id=str(uuid.uuid4()), user_id=member_ops.id, team_id=team_support.id, role="member", created_at=now),

            # Compliance team
            TeamMembership(id=str(uuid.uuid4()), user_id=lead_ops.id, team_id=team_comp.id, role="member", created_at=now),
        ]
        db.add_all(memberships)
        db.flush()

        # 4. Create Initial Operational Tasks with Versioning & Audit History
        tasks_data = [
            {
                "ref": "OPS-1001",
                "title": "Resolve warehouse dispatch synchronization failure",
                "desc": "Automated warehouse dispatch queue stalled due to network timeout with the regional freight API.",
                "type": "production_incident",
                "priority": "urgent",
                "status": "in_progress",
                "team": team_ops,
                "creator": lead_ops,
                "assignee": member_ops,
                "due": now + timedelta(hours=6),
            },
            {
                "ref": "OPS-1002",
                "title": "Weekly logistics reconciliation report",
                "desc": "Compile cross-border transit times and carrier compliance metrics for executive review.",
                "type": "operational_task",
                "priority": "medium",
                "status": "open",
                "team": team_ops,
                "creator": member_ops,
                "assignee": None,
                "due": now + timedelta(days=3),
            },
            {
                "ref": "OPS-1003",
                "title": "Carrier rate card discrepancy investigation",
                "desc": "Audit invoice delta from Q3 freight partner billing against agreed SLA terms.",
                "type": "payment_investigation",
                "priority": "high",
                "status": "blocked",
                "team": team_ops,
                "creator": lead_ops,
                "assignee": member_ops,
                "due": now - timedelta(days=1),  # Overdue
            },
            {
                "ref": "ENG-1001",
                "title": "High memory leak in billing worker pool",
                "desc": "Worker processes in cluster-east-2 consuming >85% resident memory after 12 hours of operation.",
                "type": "production_incident",
                "priority": "urgent",
                "status": "in_progress",
                "team": team_eng,
                "creator": lead_eng,
                "assignee": member_eng,
                "due": now + timedelta(hours=4),
            },
            {
                "ref": "ENG-1002",
                "title": "Database connection pool tuning for peak traffic",
                "desc": "Evaluate connection pool timeouts and statement caching under synthetic load test.",
                "type": "engineering_problem",
                "priority": "high",
                "status": "open",
                "team": team_eng,
                "creator": member_eng,
                "assignee": member_multi,
                "due": now + timedelta(days=2),
            },
            {
                "ref": "ENG-1003",
                "title": "Upgrade token signing keys and rotation schedule",
                "desc": "Implement quarterly automated key rotation for external OAuth2 integration partners.",
                "type": "compliance_request",
                "priority": "medium",
                "status": "resolved",
                "team": team_eng,
                "creator": lead_eng,
                "assignee": member_eng,
                "due": now - timedelta(days=2),
            },
            {
                "ref": "SUP-1001",
                "title": "Escalated refund request for enterprise account #8912",
                "desc": "Customer disputing dual charging during payment gateway failover on Oct 12.",
                "type": "customer_issue",
                "priority": "urgent",
                "status": "open",
                "team": team_support,
                "creator": admin_user,
                "assignee": None,
                "due": now + timedelta(hours=12),
            },
            {
                "ref": "CMP-1001",
                "title": "SOC2 Type II evidence collection: Access logs",
                "desc": "Extract and verify immutable audit trail records for production access during Q3.",
                "type": "compliance_request",
                "priority": "high",
                "status": "in_progress",
                "team": team_comp,
                "creator": admin_user,
                "assignee": lead_ops,
                "due": now + timedelta(days=5),
            },
        ]

        for item in tasks_data:
            task_obj = Task(
                id=str(uuid.uuid4()),
                task_ref=item["ref"],
                title=item["title"],
                description=item["desc"],
                type=item["type"],
                status=item["status"],
                priority=item["priority"],
                team_id=item["team"].id,
                created_by_id=item["creator"].id,
                assignee_id=item["assignee"].id if item["assignee"] else None,
                due_date=item["due"],
                version=1,
                created_at=now - timedelta(hours=2),
                updated_at=now - timedelta(minutes=15)
            )
            db.add(task_obj)
            db.flush()

            # Add creation audit event
            audit_created = AuditEvent(
                id=str(uuid.uuid4()),
                task_id=task_obj.id,
                user_id=item["creator"].id,
                action="task_created",
                details=json.dumps({
                    "title": task_obj.title,
                    "type": task_obj.type,
                    "priority": task_obj.priority,
                    "team_id": task_obj.team_id,
                }),
                created_at=now - timedelta(hours=2)
            )
            db.add(audit_created)

            # If task progressed beyond open, add a status change event
            if item["status"] != "open":
                audit_prog = AuditEvent(
                    id=str(uuid.uuid4()),
                    task_id=task_obj.id,
                    user_id=item["creator"].id,
                    action="status_changed",
                    details=json.dumps({
                        "changes": {
                            "status": {"from": "open", "to": item["status"]}
                        }
                    }),
                    created_at=now - timedelta(minutes=30)
                )
                db.add(audit_prog)

        db.commit()
        print("Database seeded successfully!")
        print("\nDemo Accounts Created (Password: 'Password123!'):")
        print("  - admin@newtonite.com        (Role: Administrator)")
        print("  - lead.ops@newtonite.com     (Role: Team Lead - Operations)")
        print("  - lead.eng@newtonite.com     (Role: Team Lead - Engineering)")
        print("  - member.ops@newtonite.com   (Role: Member - Operations)")
        print("  - member.eng@newtonite.com   (Role: Member - Engineering)")
        print("  - member.multi@newtonite.com (Role: Member - Ops & Engineering)")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
