from app.hdfs import service as hdfs_service


def test_write_and_read_file_roundtrip(test_data_dir):
    meta = hdfs_service.write_file("raw", ["year=2026", "month=01"], "unit_test.csv", b"a,b\n1,2\n")
    assert meta["simulated"] is True
    assert meta["hdfs_path"] == "/earthscape/raw/year=2026/month=01/unit_test.csv"
    content = hdfs_service.read_file(meta["path"])
    assert content == b"a,b\n1,2\n"


def test_list_zone_finds_written_file():
    hdfs_service.write_file("processed", ["batch1"], "batch1.csv", b"x")
    files = hdfs_service.list_zone("processed")
    assert any(f["name"] == "batch1.csv" for f in files)


def test_storage_stats_reports_all_zones():
    stats = hdfs_service.storage_stats()
    assert stats["simulated"] is True
    for zone in hdfs_service.ZONES:
        assert zone in stats["zones"]
    assert stats["used_pct"] >= 0


def test_health_reports_simulated_healthy():
    health = hdfs_service.health()
    assert health["simulated"] is True
    assert health["status"] == "healthy"


def test_delete_path_removes_file():
    meta = hdfs_service.write_file("models", [], "to_delete.bin", b"data")
    assert hdfs_service.delete_path(meta["path"]) is True
    assert hdfs_service.delete_path(meta["path"]) is False
