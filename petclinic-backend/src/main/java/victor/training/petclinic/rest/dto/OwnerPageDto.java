package victor.training.petclinic.rest.dto;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "A page of owners and the total number matching the search.")
public class OwnerPageDto {
    private final List<OwnerDto> items;
    private final long total;

    public OwnerPageDto(List<OwnerDto> items, long total) {
        this.items = items;
        this.total = total;
    }

    @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Owners on this page.")
    public List<OwnerDto> getItems() {
        return items;
    }

    @Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Total matching owners across all pages.")
    public long getTotal() {
        return total;
    }
}
