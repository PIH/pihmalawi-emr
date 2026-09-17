package org.openmrs.module.pihmalawi.activator;

import org.junit.Assert;
import org.junit.Test;
import org.openmrs.Person;
import org.openmrs.PersonName;
import org.openmrs.Provider;
import org.openmrs.api.context.Context;
import org.openmrs.test.BaseModuleContextSensitiveTest;

import java.util.List;

public class UnknownProviderInitializerTest extends BaseModuleContextSensitiveTest {

    @Test
    public void shouldCreateUnknownProviderIfNotPresent() {
        Assert.assertNull(Context.getProviderService().getProviderByUuid(UnknownProviderInitializer.UUID));

        new UnknownProviderInitializer().started();

        Provider provider = Context.getProviderService().getProviderByUuid(UnknownProviderInitializer.UUID);
        Assert.assertNotNull(provider);
        Person person = provider.getPerson();
        Assert.assertNotNull(person);
        Assert.assertEquals(UnknownProviderInitializer.GENDER, person.getGender());
        PersonName name = person.getPersonName();
        Assert.assertEquals(UnknownProviderInitializer.GIVEN_NAME, name.getGivenName());
        Assert.assertEquals(UnknownProviderInitializer.FAMILY_NAME, name.getFamilyName());
    }

    @Test
    public void shouldNotCreateDuplicateIfAlreadyPresent() {
        new UnknownProviderInitializer().started();
        Provider first = Context.getProviderService().getProviderByUuid(UnknownProviderInitializer.UUID);

        new UnknownProviderInitializer().started();

        List<Provider> allProviders = Context.getProviderService().getAllProviders();
        int matching = 0;
        for (Provider p : allProviders) {
            if (UnknownProviderInitializer.UUID.equals(p.getUuid())) {
                matching++;
            }
        }
        Assert.assertEquals(1, matching);
        Assert.assertEquals(first.getProviderId(), Context.getProviderService().getProviderByUuid(UnknownProviderInitializer.UUID).getProviderId());
    }

    @Test
    public void shouldBeRegisteredInActivatorInitializerList() {
        List<Initializer> initializers = new PihMalawiModuleActivator().getInitializers();
        boolean present = false;
        for (Initializer initializer : initializers) {
            if (initializer instanceof UnknownProviderInitializer) {
                present = true;
            }
        }
        Assert.assertTrue("UnknownProviderInitializer should be registered in PihMalawiModuleActivator", present);
    }
}
