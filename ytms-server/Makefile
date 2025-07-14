
# Stop Redis container
stop-redis:
	docker stop redis-server && docker rm redis-server

# Run Redis Server
run-redis-server:
	docker run -d --name redis-server -p 6379:6379 -e REDIS_PASSWORD=abhijith_pass redis redis-server --requirepass "abhijith_pass"

# Restart Redis Server
restart-redis:
	make stop-redis && make run-redis-server