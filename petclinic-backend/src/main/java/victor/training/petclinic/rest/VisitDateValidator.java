package victor.training.petclinic.rest;

import java.time.LocalDate;
import org.springframework.web.server.ResponseStatusException;
import victor.training.petclinic.domain.Pet;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

final class VisitDateValidator {
    private VisitDateValidator() {
    }

    static void validate(LocalDate date, Pet pet) {
        LocalDate latestAllowedDate = LocalDate.now().plusYears(1);
        LocalDate birthDate = pet.getBirthDate();
        if (date == null || (birthDate != null && date.isBefore(birthDate)) || date.isAfter(latestAllowedDate)) {
            throw new ResponseStatusException(BAD_REQUEST,
                    "Visit date must be between the pet's birth date and one year from today");
        }
    }
}
