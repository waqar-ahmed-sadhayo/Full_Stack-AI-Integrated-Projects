"""Reference geography used to generate/seed realistic multi-city climate data."""

CITIES = [
    {"city": "New York", "country": "USA", "region": "North America", "lat": 40.7128, "lon": -74.0060, "base_temp": 13, "amp": 12},
    {"city": "Los Angeles", "country": "USA", "region": "North America", "lat": 34.0522, "lon": -118.2437, "base_temp": 18, "amp": 6},
    {"city": "Toronto", "country": "Canada", "region": "North America", "lat": 43.6532, "lon": -79.3832, "base_temp": 8, "amp": 14},
    {"city": "Mexico City", "country": "Mexico", "region": "North America", "lat": 19.4326, "lon": -99.1332, "base_temp": 17, "amp": 4},
    {"city": "Sao Paulo", "country": "Brazil", "region": "South America", "lat": -23.5505, "lon": -46.6333, "base_temp": 20, "amp": 5},
    {"city": "Buenos Aires", "country": "Argentina", "region": "South America", "lat": -34.6037, "lon": -58.3816, "base_temp": 17, "amp": 8},
    {"city": "Lima", "country": "Peru", "region": "South America", "lat": -12.0464, "lon": -77.0428, "base_temp": 19, "amp": 4},
    {"city": "London", "country": "UK", "region": "Europe", "lat": 51.5072, "lon": -0.1276, "base_temp": 11, "amp": 8},
    {"city": "Berlin", "country": "Germany", "region": "Europe", "lat": 52.5200, "lon": 13.4050, "base_temp": 9, "amp": 10},
    {"city": "Madrid", "country": "Spain", "region": "Europe", "lat": 40.4168, "lon": -3.7038, "base_temp": 15, "amp": 11},
    {"city": "Rome", "country": "Italy", "region": "Europe", "lat": 41.9028, "lon": 12.4964, "base_temp": 16, "amp": 9},
    {"city": "Nairobi", "country": "Kenya", "region": "Africa", "lat": -1.2921, "lon": 36.8219, "base_temp": 19, "amp": 2},
    {"city": "Cairo", "country": "Egypt", "region": "Africa", "lat": 30.0444, "lon": 31.2357, "base_temp": 22, "amp": 8},
    {"city": "Lagos", "country": "Nigeria", "region": "Africa", "lat": 6.5244, "lon": 3.3792, "base_temp": 27, "amp": 2},
    {"city": "Cape Town", "country": "South Africa", "region": "Africa", "lat": -33.9249, "lon": 18.4241, "base_temp": 17, "amp": 5},
    {"city": "Mumbai", "country": "India", "region": "Asia", "lat": 19.0760, "lon": 72.8777, "base_temp": 27, "amp": 4},
    {"city": "Beijing", "country": "China", "region": "Asia", "lat": 39.9042, "lon": 116.4074, "base_temp": 13, "amp": 16},
    {"city": "Tokyo", "country": "Japan", "region": "Asia", "lat": 35.6762, "lon": 139.6503, "base_temp": 16, "amp": 11},
    {"city": "Jakarta", "country": "Indonesia", "region": "Asia", "lat": -6.2088, "lon": 106.8456, "base_temp": 27, "amp": 1.5},
    {"city": "Singapore", "country": "Singapore", "region": "Asia", "lat": 1.3521, "lon": 103.8198, "base_temp": 27, "amp": 1},
    {"city": "Sydney", "country": "Australia", "region": "Oceania", "lat": -33.8688, "lon": 151.2093, "base_temp": 18, "amp": 6},
    {"city": "Auckland", "country": "New Zealand", "region": "Oceania", "lat": -36.8485, "lon": 174.7633, "base_temp": 15, "amp": 5},
    {"city": "Reykjavik", "country": "Iceland", "region": "Europe", "lat": 64.1466, "lon": -21.9426, "base_temp": 5, "amp": 8},
    {"city": "Dubai", "country": "UAE", "region": "Asia", "lat": 25.2048, "lon": 55.2708, "base_temp": 28, "amp": 9},
    {"city": "Moscow", "country": "Russia", "region": "Europe", "lat": 55.7558, "lon": 37.6173, "base_temp": 6, "amp": 18},
]

DATA_SOURCES = ["Satellite", "Weather Station", "Environmental Sensor", "IoT Device", "Historical Database"]

REGIONS = sorted({c["region"] for c in CITIES})
COUNTRIES = sorted({c["country"] for c in CITIES})
