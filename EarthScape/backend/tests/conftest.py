import os
import tempfile
from pathlib import Path

_TEST_DATA_DIR = Path(tempfile.mkdtemp(prefix="earthscape_test_"))
os.environ["DEMO_MODE"] = "true"
os.environ["MONGO_URI"] = ""
os.environ["HDFS_LOCAL_ROOT"] = str(_TEST_DATA_DIR / "hdfs_simulated")
os.environ["UPLOAD_DIR"] = str(_TEST_DATA_DIR / "uploads")
os.environ["MODEL_DIR"] = str(_TEST_DATA_DIR / "models")
os.environ["REPORT_DIR"] = str(_TEST_DATA_DIR / "reports")
os.environ["JWT_SECRET_KEY"] = "test-secret-key-not-for-production"
os.environ["RATE_LIMIT_PER_MINUTE"] = "100000"

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.data.sample_data_generator import generate_climate_records, generate_default_users
from app.database import db
from app.main import app


@pytest_asyncio.fixture(scope="session", autouse=True)
async def _init_db():
    await db.connect()
    users_coll = db.get_collection("users")
    if await users_coll.count({}) == 0:
        await users_coll.insert_many(generate_default_users())
    records_coll = db.get_collection("climate_records")
    if await records_coll.count({}) == 0:
        await records_coll.insert_many(generate_climate_records(days=90))
    yield


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def _login(client, email, password):
    res = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


@pytest_asyncio.fixture
async def admin_token(client):
    return await _login(client, "admin@earthscape.io", "Admin@12345")


@pytest_asyncio.fixture
async def analyst_token(client):
    return await _login(client, "analyst@earthscape.io", "Analyst@12345")


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_data_dir() -> Path:
    return _TEST_DATA_DIR
