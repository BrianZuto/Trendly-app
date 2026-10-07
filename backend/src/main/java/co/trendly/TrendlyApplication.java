package co.trendly;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class TrendlyApplication {

	public static void main(String[] args) {
		SpringApplication.run(TrendlyApplication.class, args);
	}

}
