cp .env.staging .env
docker-compose down --volumes --rmi all
docker-compose up -d
docker-compose rm -f -v