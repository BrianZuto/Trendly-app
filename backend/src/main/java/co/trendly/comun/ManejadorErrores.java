package co.trendly.comun;

import java.util.Comparator;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import co.trendly.producto.LimitePlanException;
import co.trendly.producto.ProductoNoEncontradoException;
import co.trendly.producto.SkuRepetidoException;
import co.trendly.seguridad.CredencialesInvalidasException;
import co.trendly.seguridad.RespuestaError;
import co.trendly.seguridad.TokenSinUsuarioException;
import co.trendly.usuario.EmailYaRegistradoException;
import jakarta.servlet.http.HttpServletRequest;

/**
 * Convierte las excepciones de los controladores en el mismo JSON de error que usan los 401 y 403
 * ({@link RespuestaError}). El frontend muestra el campo "message".
 */
@RestControllerAdvice
public class ManejadorErrores {

    /** Errores de Bean Validation: un mensaje por campo, ordenados por nombre de campo para que sea estable. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<RespuestaError> datosInvalidos(MethodArgumentNotValidException e, HttpServletRequest request) {
        String mensaje = e.getBindingResult().getFieldErrors().stream()
                .sorted(Comparator.comparing(FieldError::getField))
                .map(FieldError::getDefaultMessage)
                .distinct()
                .collect(Collectors.joining(". "));
        return error(HttpStatus.BAD_REQUEST, mensaje.isBlank() ? "Datos inválidos" : mensaje, request);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<RespuestaError> cuerpoIlegible(HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, "El cuerpo de la solicitud no es un JSON válido", request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<RespuestaError> argumentoInvalido(IllegalArgumentException e, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, e.getMessage(), request);
    }

    @ExceptionHandler({EmailYaRegistradoException.class, SkuRepetidoException.class})
    ResponseEntity<RespuestaError> repetido(RuntimeException e, HttpServletRequest request) {
        return error(HttpStatus.CONFLICT, e.getMessage(), request);
    }

    @ExceptionHandler({CredencialesInvalidasException.class, TokenSinUsuarioException.class})
    ResponseEntity<RespuestaError> noAutenticado(RuntimeException e, HttpServletRequest request) {
        return error(HttpStatus.UNAUTHORIZED, e.getMessage(), request);
    }

    @ExceptionHandler(ProductoNoEncontradoException.class)
    ResponseEntity<RespuestaError> noEncontrado(ProductoNoEncontradoException e, HttpServletRequest request) {
        return error(HttpStatus.NOT_FOUND, e.getMessage(), request);
    }

    @ExceptionHandler(LimitePlanException.class)
    ResponseEntity<RespuestaError> limitePlan(LimitePlanException e, HttpServletRequest request) {
        return error(HttpStatus.UNPROCESSABLE_CONTENT, e.getMessage(), request);
    }

    /** Un id que no es número, por ejemplo {@code /productos/abc}. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<RespuestaError> parametroInvalido(HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, "Parámetro inválido", request);
    }

    private static ResponseEntity<RespuestaError> error(HttpStatus estado, String mensaje, HttpServletRequest request) {
        return ResponseEntity.status(estado)
                .body(new RespuestaError(estado.value(), estado.getReasonPhrase(), mensaje, request.getRequestURI()));
    }
}
