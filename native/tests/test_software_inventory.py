"""
Unit and Integration Tests for Installed Software Inventory & Excel Export
Validates system detection, metadata extraction, deduplication, and OpenXML Excel export.
"""

import os
import sys
import unittest
import zipfile
import io
import re

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import software_inventory
import database

class TestInstalledSoftwareInventory(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Force a fresh scan for testing
        cls.inventory = software_inventory.scan_installed_software(force_refresh=True)

    def test_inventory_non_empty(self):
        """Validates that real installed software is detected from the host system."""
        self.assertGreater(len(self.inventory), 0, "Inventory must contain installed software")
        # On Ubuntu system with desktop + dpkg, expect > 1000 items
        self.assertGreater(len(self.inventory), 500, "Expected hundreds of installed packages on Linux")

    def test_visual_studio_detected(self):
        """Validates that Visual Studio Code is detected with version and publisher."""
        vs_code_matches = [
            p for p in self.inventory 
            if "visual studio" in p["name"].lower() or p.get("package_id") == "code"
        ]
        self.assertGreaterEqual(len(vs_code_matches), 1, "Visual Studio Code must be detected in inventory")
        vs_entry = vs_code_matches[0]
        self.assertIn("Visual Studio", vs_entry["name"])
        self.assertNotEqual(vs_entry["version"], "N/A", "Visual Studio Code version must not be N/A")
        self.assertTrue(re.match(r'^\d+\.\d+', vs_entry["version"]), f"Expected semver for VS Code, got {vs_entry['version']}")
        self.assertIn("Microsoft", vs_entry["publisher"])
        self.assertEqual(vs_entry["source"], "Snap Application")

    def test_antigravity_detected(self):
        """Validates that Antigravity is detected with version 2.29.0 and Google publisher."""
        anti_matches = [p for p in self.inventory if p["name"].lower() == "antigravity"]
        self.assertGreaterEqual(len(anti_matches), 1, "Antigravity must be detected in inventory")
        anti = anti_matches[0]
        self.assertEqual(anti["version"], "2.29.0")
        self.assertIn("Google", anti["publisher"])
        self.assertEqual(anti["source"], "Snap Package" if anti["source"] == "Snap Package" else "Snap Application")

    def test_required_metadata_keys(self):
        """Validates that every single package in the inventory has all required keys."""
        required_keys = [
            "name", "version", "publisher", "category",
            "install_path", "install_date", "source", "summary"
        ]
        for p in self.inventory:
            for k in required_keys:
                self.assertIn(k, p, f"Package {p.get('name')} missing key {k}")
                self.assertIsNotNone(p[k], f"Package {p.get('name')} key {k} must not be None")

    def test_clean_xml_str_sanitization(self):
        """Validates that clean_xml_str properly handles invalid control chars and escapes."""
        raw = "Visual & Studio <Test> 'Quotes' \x00\x05\x1f"
        cleaned = software_inventory.clean_xml_str(raw)
        self.assertNotIn("\x00", cleaned)
        self.assertNotIn("\x05", cleaned)
        self.assertNotIn("\x1f", cleaned)
        self.assertIn("&amp;", cleaned)
        self.assertIn("&lt;", cleaned)
        self.assertIn("&gt;", cleaned)

    def test_openxml_xlsx_validity(self):
        """Validates that the generated .xlsx is a valid multi-sheet workbook with category worksheets."""
        xlsx_bytes = software_inventory.generate_software_xlsx(self.inventory)
        self.assertIsInstance(xlsx_bytes, bytes)
        self.assertGreater(len(xlsx_bytes), 1000)

        # Inspect ZIP structure
        with zipfile.ZipFile(io.BytesIO(xlsx_bytes), "r") as z:
            namelist = z.namelist()
            self.assertIn("[Content_Types].xml", namelist)
            self.assertIn("_rels/.rels", namelist)
            self.assertIn("xl/workbook.xml", namelist)
            self.assertIn("xl/styles.xml", namelist)
            self.assertIn("xl/worksheets/sheet1.xml", namelist)
            self.assertIn("xl/worksheets/sheet2.xml", namelist)

            # Check workbook.xml contains category sheets
            wb_xml = z.read("xl/workbook.xml").decode("utf-8")
            self.assertIn("Executive Summary", wb_xml)
            self.assertIn("Desktop &amp; GUI Apps", wb_xml)
            self.assertIn("Development &amp; IDEs", wb_xml)
            self.assertIn("Snap Packages", wb_xml)
            self.assertIn("All Software (Master)", wb_xml)

            # Check that sheet2.xml (Desktop & GUI Apps) contains Visual Studio Code with inlineStr
            sheet2_content = z.read("xl/worksheets/sheet2.xml").decode("utf-8")
            self.assertIn('t="inlineStr"', sheet2_content)
            self.assertIn("Visual Studio Code", sheet2_content)

    def test_database_module_integration(self):
        """Validates that database.py delegates to software_inventory seamlessly."""
        db_packages = database.get_installed_software()
        self.assertGreater(len(db_packages), 0)
        xlsx = database.export_software_xlsx()
        self.assertGreater(len(xlsx), 1000)
        csv_str = database.export_software_csv()
        self.assertTrue(csv_str.startswith("\ufeff"), "CSV must include UTF-8 BOM")
        self.assertIn("Visual Studio Code", csv_str)

if __name__ == "__main__":
    unittest.main()
