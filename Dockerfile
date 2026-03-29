# 1. Zvolíme základní obraz (image). 'slim' verze je menší a rychlejší.
FROM python:3.11-slim

# 2. Zabráníme Pythonu vytvářet .pyc soubory a zajistíme výpis logů hned do konzole
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 3. Nastavíme pracovní složku uvnitř kontejneru
WORKDIR /app

# 4. Zkopírujeme NEJDŘÍVE jen requirements.txt.
# Tohle je trik pro zrychlení buildování (Docker využije cache, pokud se knihovny nezměnily).
COPY requirements.txt .

# 5. Nainstalujeme potřebné knihovny
RUN pip install --no-cache-dir -r requirements.txt

# 6. Zkopírujeme zbytek kódu aplikace do kontejneru
COPY . .

# 7. Informujeme Docker, na kterém portu API poběží (zde 8001)
EXPOSE 8001

# 8. Příkaz pro spuštění API.
# ZDE ZÁLEŽÍ NA TVÉM FRAMEWORKU (viz poznámky níže)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]