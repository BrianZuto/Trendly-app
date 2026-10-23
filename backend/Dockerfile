# Imagen del backend para Azure Container Apps. Se construye con el jar ya compilado:
#   ./mvnw -B -DskipTests package && az acr build -r <registro> -t trendly-api:<versión> backend/
FROM eclipse-temurin:21-jre-jammy

WORKDIR /app
COPY target/backend-0.0.1-SNAPSHOT.jar app.jar

# Sin usuario root dentro del contenedor
RUN useradd --system --uid 1001 trendly
USER trendly

EXPOSE 8080
# El contenedor tiene 1 GiB: la JVM usa hasta el 75 %
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
