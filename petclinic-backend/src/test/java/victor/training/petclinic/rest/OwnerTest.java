package victor.training.petclinic.rest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.util.List;

import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import io.zonky.test.db.AutoConfigureEmbeddedDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import victor.training.petclinic.domain.Owner;
import victor.training.petclinic.domain.Pet;
import victor.training.petclinic.domain.PetType;
import victor.training.petclinic.repository.OwnerRepository;
import victor.training.petclinic.repository.PetRepository;
import victor.training.petclinic.repository.PetTypeRepository;
import victor.training.petclinic.rest.dto.OwnerDto;
import victor.training.petclinic.rest.dto.PetDto;
import victor.training.petclinic.rest.dto.PetTypeDto;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import jakarta.transaction.Transactional;

@SpringBootTest
@AutoConfigureEmbeddedDatabase(provider = AutoConfigureEmbeddedDatabase.DatabaseProvider.ZONKY)
@AutoConfigureMockMvc
@WithMockUser(roles = "OWNER_ADMIN")
@Transactional
public class OwnerTest {

    @Autowired
    MockMvc mockMvc;

    ObjectMapper mapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .setDateFormat(new SimpleDateFormat("yyyy-MM-dd"))
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    @Autowired
    OwnerRepository ownerRepository;

    @Autowired
    PetRepository petRepository;

    @Autowired
    PetTypeRepository petTypeRepository;

    int ownerId;
    int petId;
    PetType petType;

    @BeforeEach
    final void before() {
        Owner owner = TestData.anOwner();
        owner.setFirstName("George");
        owner.setLastName("Franklin");
        owner = ownerRepository.save(owner);
        ownerId = owner.getId();

        petType = new PetType();
        petType.setName("dog");
        petType = petTypeRepository.save(petType);

        Pet pet = new Pet();
        pet.setName("Rosy");
        pet.setBirthDate(LocalDate.now());
        pet.setOwner(owner);
        pet.setType(petType);
        pet = petRepository.save(pet);
        petId = pet.getId();

        // Add pet to owner's collection for bidirectional relationship
        owner.addPet(pet);
    }

    private OwnerDto callGet(int ownerId) throws Exception {
        String responseJson = mockMvc.perform(get("/api/owners/" + ownerId))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/json"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        return mapper.readValue(responseJson, OwnerDto.class);
    }

    @Test
    void getByIdOk() throws Exception {
        OwnerDto responseDto = callGet(ownerId);

        assertThat(responseDto.getId()).isEqualTo(ownerId);
        assertThat(responseDto.getFirstName()).isEqualTo("George");
        assertThat(responseDto.getLastName()).isEqualTo("Franklin");
    }

    @Test
    void getById_notFound() throws Exception {
        mockMvc.perform(get("/api/owners/99999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void count_returnsOwnerCount() throws Exception {
        long before = ownerRepository.count();

        mockMvc.perform(get("/api/owners/count"))
                .andExpect(status().isOk())
                .andExpect(content().string(String.valueOf(before)));
    }

    @Test
    void getAll() throws Exception {
        List<OwnerDto> owners = search("/api/owners");

        assertThat(owners)
                .extracting(OwnerDto::getId, OwnerDto::getFirstName, OwnerDto::getLastName)
                .contains(Assertions.tuple(ownerId, "George", "Franklin"));
    }

    @Test
    void getAllWithAddressFilter_matchesLastNameSubstringCaseInsensitively() throws Exception {
        Owner owner2 = TestData.anOwner();
        owner2.setLastName("JavaBeans");
        int owner2Id = ownerRepository.save(owner2).getId();

        List<OwnerDto> owners = search("/api/owners?search=java");

        assertThat(owners)
                .extracting(OwnerDto::getId, OwnerDto::getLastName)
                .contains(Assertions.tuple(owner2Id, "JavaBeans"));
    }

    @Test
    void search_matchesFirstNameSubstring() throws Exception {
        List<OwnerDto> owners = search("/api/owners?search=eorg");

        assertThat(owners).extracting(OwnerDto::getId).contains(ownerId);
    }

    @Test
    void search_matchesAddress() throws Exception {
        List<OwnerDto> owners = search("/api/owners?search=Baker St");

        assertThat(owners).extracting(OwnerDto::getId).contains(ownerId);
    }

    @Test
    void search_matchesCity() throws Exception {
        List<OwnerDto> owners = search("/api/owners?search=london");

        assertThat(owners).extracting(OwnerDto::getId).contains(ownerId);
    }

    @Test
    void search_matchesTelephone() throws Exception {
        List<OwnerDto> owners = search("/api/owners?search=234567");

        assertThat(owners).extracting(OwnerDto::getId).contains(ownerId);
    }

    @Test
    void search_matchesPetName() throws Exception {
        List<OwnerDto> owners = search("/api/owners?search=rosy");

        assertThat(owners).extracting(OwnerDto::getId).contains(ownerId);
    }

    @Test
    void search_blankListsEveryOwner() throws Exception {
        List<OwnerDto> owners = search("/api/owners?search=");

        assertThat(owners).extracting(OwnerDto::getId).contains(ownerId);
    }

    private List<OwnerDto> search(String uriTemplate) throws Exception {
        String responseJson = mockMvc.perform(get(uriTemplate))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/json"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        return mapper.readValue(responseJson, new TypeReference<List<OwnerDto>>() {
        });
    }

    @Test
    void search_noMatch_returnsEmpty() throws Exception {
        List<OwnerDto> results = search("/api/owners?search=NonExistent");

        assertThat(results).isEmpty();
    }

    @Test
    void page_returnsTotalAndRequestedSliceInDisplayedNameOrder() throws Exception {
        saveOwner("Zoe", "Zulu");
        saveOwner("Amy", "Zee");
        saveOwner("Amy", "Able");
        saveOwner("Bobby", "Brown");
        saveOwner("Molly", "Moore");
        saveOwner("Victor", "Vance");

        JsonNode firstPage = page("/api/owners/page?page=0&size=5");
        JsonNode secondPage = page("/api/owners/page?page=1&size=5");

        assertThat(firstPage.path("total").asLong()).isEqualTo(7);
        assertThat(firstPage.path("items").size()).isEqualTo(5);
        assertThat(ownerNames(firstPage)).containsExactly(
                "Amy Able", "Amy Zee", "Bobby Brown", "George Franklin", "Molly Moore");
        assertThat(ownerNames(secondPage)).containsExactly("Victor Vance", "Zoe Zulu");
    }

    @Test
    void page_filtersBeforePagingAndSortsPetsByJoinedAlphabeticalNames() throws Exception {
        Owner amy = saveOwner("Amy", "Alpha");
        addPet(amy, "Zed");
        addPet(amy, "Alpha");
        Owner zoe = saveOwner("Zoe", "Zulu");
        addPet(zoe, "Mango");

        JsonNode searchPage = page("/api/owners/page?search=rosy&page=0&size=5");
        JsonNode petsPage = page("/api/owners/page?page=0&size=5&sort=pets");

        assertThat(searchPage.path("total").asLong()).isEqualTo(1);
        assertThat(ownerNames(searchPage)).containsExactly("George Franklin");
        assertThat(ownerNames(petsPage)).containsExactly("Amy Alpha", "Zoe Zulu", "George Franklin");
    }

    @Test
    void page_rejectsUnsupportedPageSizeAndSortColumn() throws Exception {
        mockMvc.perform(get("/api/owners/page?size=7"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/owners/page?sort=unknown"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void page_sortsByAddressCityAndTelephone() throws Exception {
        Owner george = ownerRepository.findById(ownerId).orElseThrow();
        george.setAddress("Delta");
        george.setCity("London");
        george.setTelephone("5000000000");
        ownerRepository.save(george);

        Owner amy = saveOwner("Amy", "Alpha");
        amy.setAddress("Alpha");
        amy.setCity("York");
        amy.setTelephone("9000000000");
        ownerRepository.save(amy);
        Owner zoe = saveOwner("Zoe", "Zulu");
        zoe.setAddress("Beta");
        zoe.setCity("Bath");
        zoe.setTelephone("1000000000");
        ownerRepository.save(zoe);

        assertThat(ownerNames(page("/api/owners/page?sort=address")))
                .containsExactly("Amy Alpha", "Zoe Zulu", "George Franklin");
        assertThat(ownerNames(page("/api/owners/page?sort=city")))
                .containsExactly("Zoe Zulu", "George Franklin", "Amy Alpha");
        assertThat(ownerNames(page("/api/owners/page?sort=telephone")))
                .containsExactly("Zoe Zulu", "George Franklin", "Amy Alpha");
    }

    private Owner saveOwner(String firstName, String lastName) {
        Owner owner = TestData.anOwner();
        owner.setFirstName(firstName);
        owner.setLastName(lastName);
        return ownerRepository.save(owner);
    }

    private void addPet(Owner owner, String name) {
        Pet pet = new Pet();
        pet.setName(name);
        pet.setBirthDate(LocalDate.now());
        pet.setType(petType);
        owner.addPet(pet);
        petRepository.save(pet);
    }

    private JsonNode page(String uri) throws Exception {
        String responseJson = mockMvc.perform(get(uri))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/json"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        return mapper.readTree(responseJson);
    }

    private List<String> ownerNames(JsonNode page) {
        List<String> names = new java.util.ArrayList<>();
        page.path("items").forEach(owner ->
                names.add(owner.path("firstName").asText() + " " + owner.path("lastName").asText()));
        return names;
    }

    @Test
    void update_ok() throws Exception {
        OwnerDto existing = callGet(ownerId);
        existing.setFirstName("GeorgeI");

        mockMvc.perform(put("/api/owners/" + ownerId)
                .content(mapper.writeValueAsString(existing))
                .contentType(MediaType.APPLICATION_JSON_VALUE))
                .andExpect(status().is2xxSuccessful());

        // assert the update took place
        OwnerDto updated = callGet(ownerId);
        assertThat(updated.getFirstName()).isEqualTo("GeorgeI");
    }

    @Test
    void update_okNoBodyId() throws Exception {
        OwnerDto existing = callGet(ownerId);
        existing.setId(null); // Test without body ID
        existing.setFirstName("GeorgeII");

        mockMvc.perform(put("/api/owners/" + ownerId)
                .content(mapper.writeValueAsString(existing))
                .contentType(MediaType.APPLICATION_JSON_VALUE))
                .andExpect(status().is2xxSuccessful());

        // assert the update took place
        OwnerDto updated = callGet(ownerId);
        assertThat(updated.getFirstName()).isEqualTo("GeorgeII");
    }

    @Test
    void update_invalid() throws Exception {
        OwnerDto existing = callGet(ownerId);
        existing.setFirstName(""); // invalid firstName

        mockMvc.perform(put("/api/owners/" + ownerId)
                .content(mapper.writeValueAsString(existing))
                .contentType(MediaType.APPLICATION_JSON_VALUE))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void delete_ok() throws Exception {
        mockMvc.perform(delete("/api/owners/" + ownerId))
                .andExpect(status().is2xxSuccessful());

        mockMvc.perform(get("/api/owners/" + ownerId))
                .andExpect(status().isNotFound());
    }

    @Test
    void delete_notFound() throws Exception {
        mockMvc.perform(delete("/api/owners/9999"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void createPet_invalid() throws Exception {
        PetTypeDto typeDto = new PetTypeDto()
                .setId(petType.getId())
                .setName(petType.getName());
        // missing name - validation error
        PetDto newPet = new PetDto()
                .setBirthDate(LocalDate.now())
                .setType(typeDto);

        mockMvc.perform(post("/api/owners/" + ownerId + "/pets")
                .content(mapper.writeValueAsString(newPet))
                .contentType(MediaType.APPLICATION_JSON_VALUE))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getOwnerPet_ok() throws Exception {
        mockMvc.perform(get("/api/owners/" + ownerId + "/pets/" + petId))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/json"))
                .andExpect(jsonPath("$.id").value(petId))
                .andExpect(jsonPath("$.name").value("Rosy"));
    }

    @Test
    void getOwnerPet_ownerNotFound() throws Exception {
        mockMvc.perform(get("/api/owners/99999/pets/" + petId))
                .andExpect(status().isNotFound());
    }

    @Test
    void getOwnerPet_petNotFound() throws Exception {
        mockMvc.perform(get("/api/owners/" + ownerId + "/pets/99999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateOwnerPet_ok() throws Exception {
        PetTypeDto typeDto = new PetTypeDto()
                .setId(petType.getId())
                .setName(petType.getName());
        PetDto petDto = new PetDto()
                .setId(petId)
                .setName("Rosy Updated")
                .setBirthDate(LocalDate.of(2020, 1, 15))
                .setType(typeDto);

        mockMvc.perform(put("/api/owners/" + ownerId + "/pets/" + petId)
                .content(mapper.writeValueAsString(petDto))
                .contentType(MediaType.APPLICATION_JSON_VALUE))
                .andExpect(status().is2xxSuccessful());
    }

    @Test
    void updateOwnerPet_ownerNotFound() throws Exception {
        PetTypeDto typeDto = new PetTypeDto()
                .setId(petType.getId())
                .setName(petType.getName());
        PetDto petDto = new PetDto()
                .setName("Thor")
                .setBirthDate(LocalDate.now())
                .setType(typeDto);

        mockMvc.perform(put("/api/owners/99999/pets/" + petId)
                .content(mapper.writeValueAsString(petDto))
                .contentType(MediaType.APPLICATION_JSON_VALUE))
                .andExpect(status().is2xxSuccessful());
    }

    @Test
    void updateOwnerPet_petNotFound() throws Exception {
        PetTypeDto typeDto = new PetTypeDto()
                .setId(petType.getId())
                .setName(petType.getName());
        PetDto petDto = new PetDto()
                .setName("Ghost")
                .setBirthDate(LocalDate.of(2020, 1, 1))
                .setType(typeDto);

        mockMvc.perform(put("/api/owners/" + ownerId + "/pets/99999")
                .content(mapper.writeValueAsString(petDto))
                .contentType(MediaType.APPLICATION_JSON_VALUE))
                .andExpect(status().isNotFound());
    }

}
