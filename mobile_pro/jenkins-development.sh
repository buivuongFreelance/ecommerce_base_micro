cp .env.development .env
docker-compose -f docker-compose-development.yml down --volumes --rmi all
docker-compose -f docker-compose-development.yml up -d
docker-compose rm -f -v