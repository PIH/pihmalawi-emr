/**
 * The contents of this file are subject to the OpenMRS Public License
 * Version 1.0 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://license.openmrs.org
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
 * License for the specific language governing rights and limitations
 * under the License.
 *
 * Copyright (C) OpenMRS, LLC.  All Rights Reserved.
 */
package org.openmrs.module.pihmalawi.activator;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.openmrs.api.context.Context;
import org.openmrs.module.BaseModuleActivator;
import org.openmrs.module.DaemonToken;
import org.openmrs.module.DaemonTokenAware;
import org.openmrs.module.appframework.domain.Extension;
import org.openmrs.module.appframework.repository.AllFreeStandingExtensions;
import org.openmrs.module.appui.AppUiExtensions;
import org.openmrs.module.emrapi.EmrApiActivator;
import org.openmrs.module.pihmalawi.data.IC3ScreeningDataLoader;
import org.openmrs.module.pihmalawi.setup.CloseStaleVisitsSetup;
import org.openmrs.module.reporting.common.ObjectUtil;
import org.openmrs.module.reporting.config.ReportLoader;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class PihMalawiModuleActivator extends BaseModuleActivator implements DaemonTokenAware {

	private Log log = LogFactory.getLog(this.getClass());

    @Override
    public void contextRefreshed() {
        log.info("PIH Malawi Module refreshed");
        CloseStaleVisitsSetup.setupCloseStaleVisitsTask();
    }

    @Override
    public void willRefreshContext() {
        log.info("Refreshing PIH Malawi Module");
        IC3ScreeningDataLoader.setEnabled(false);
    }

    @Override
    public void willStart() {
        log.info("Starting PIH Malawi Module");
    }

    @Override
    public void willStop() {
        log.info("Stopping PIH Malawi Module");
    }

    public List<Initializer> getInitializers() {
		List<Initializer> l = new ArrayList<Initializer>();
		l.add(new MetadataInitializer());
		l.add(new GlobalPropertyInitializer());
		l.add(new LocationInitializer());
		l.add(new SoundexInitializer());
		l.add(new HtmlFormInitializer());
		l.add(new ReportInitializer());
        l.add(new AuthenticationInitializer());
		return l;
	}

	@Override
	public void started() {
		log.info("pihmalawi module started - initializing...");
		for (Initializer initializer : getInitializers()) {
			initializer.started();
		}
		// emrapi's own contextRefreshed() already granted every privilege that existed at that
		// point to "Privilege Level: Full"/"Privilege Level: High", but that ran before the
		// privileges.csv loading above created ours - re-run it now that the full privilege set exists.
		new EmrApiActivator().contextRefreshed();
		// New bug/feature in Chrome/IE/Safari causes system to log out user with default logo link url.  Update this here.
        List<AllFreeStandingExtensions> l = Context.getRegisteredComponents(AllFreeStandingExtensions.class);
        if (l != null && l.size() > 0) {
            AllFreeStandingExtensions extensions = l.get(0);
            Map<String, Object> extensionParams = ObjectUtil.toMap("logo-link-url", "/index.htm");
            Extension e = new Extension("pihmalawi.headerExtension", null, AppUiExtensions.HEADER_CONFIG_EXTENSION, null, null, null, 100, null, extensionParams);
            extensions.add(e);
        }

        IC3ScreeningDataLoader.setEnabled(true);
        Context.getRegisteredComponents(IC3ScreeningDataLoader.class).get(0).runImmediately();
    }

	@Override
	public void stopped() {
		for (int i=getInitializers().size()-1; i>=0; i--) {
			getInitializers().get(i).stopped();
		}
		log.info("pihmalawi module stopped");
	}

    @Override
    public void setDaemonToken(DaemonToken daemonToken) {
        IC3ScreeningDataLoader.setDaemonToken(daemonToken);
    }

}
