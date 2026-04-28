FROM simplest_fast_api_server

WORKDIR /app

COPY . .

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 3063

CMD ["streamlit", "run", "app.py", "--server.port=3063", "--server.address=0.0.0.0", "--server.headless=true", "--browser.serverAddress=ngnx-fawryplus.fawrypayments.com", "--server.enableCORS=false", "--server.enableXsrfProtection=false"]
