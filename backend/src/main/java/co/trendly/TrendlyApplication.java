package co.trendly;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;

// Sin usuario en memoria de Spring: la autenticación es con JWT contra la tabla usuario (SCRUM-31)
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@ConfigurationPropertiesScan
public class TrendlyApplication {

	public static void main(String[] args) {
		SpringApplication.run(TrendlyApplication.class, args);
	}

}
