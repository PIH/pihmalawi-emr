<%@ include file="/WEB-INF/template/include.jsp"%>
<%@ taglib prefix="pihmalawi" uri="/WEB-INF/view/module/pihmalawi/taglib/pihmalawi.tld" %>

<script type="text/javascript">
    <%-- TODO: FORMATDATE AND PARSEDATE ARE TERRIBLE HACKS --%>
    function parseDate_2(date) {
        if (date == null || date == '')
            return '';
    <c:choose>
        <c:when test="${model.locale == 'fr' || model.locale == 'en_GB'}">
        // dd/mm/yyyy 01/34/6789
        return date.substring(6,10) + '-' + date.substring(3,5) + '-' + date.substring(0,2);
    </c:when>
        <c:otherwise>
        // mm/dd/yyyy 01/34/6789
        return date.substring(6,10) + '-' + date.substring(0,2) + '-' + date.substring(3,5);
    </c:otherwise>
        </c:choose>
    }
    function changeToState(patientProgramId, workflowId, stateId, dateField) {
        var onDate = parseDate_2(DWRUtil.getValue(dateField));
        DWRProgramWorkflowService.changeToState(patientProgramId, workflowId, stateId, onDate, function() {
            refreshPage();
        });
    }
	function changeToStateField(patientProgramId, workflowId, stateField, dateField) {
		var onDate = parseDate_2(DWRUtil.getValue(dateField));
		var stateId = DWRUtil.getValue(stateField);

		DWRProgramWorkflowService.changeToState(patientProgramId, workflowId, stateId, onDate, function() {
			refreshPage();
		});
	}
</script>


<c:set var="personId" value="${model.personId}" />
<c:set var="patientId" value="${model.patientId}" />
<c:set var="NutritionOnTreatmentWorkflowState" value="4F148482-8B25-4ACD-A23C-B2A1D4701C2D"/>
<c:set var="NutritionActiveStates" value="4F148482-8B25-4ACD-A23C-B2A1D4701C2D,35AF01AE-AAC7-4F9B-A9A1-0EFDEB84AD5B"/>
<c:set var="NutritionTreatmentStoppedWorkflowState" value="B633E826-943D-427F-BEC9-C19DBB31DAAE"/>
<c:set var="NutritionTransferedOutWorkflowState" value="228C3CE4-3685-459C-ABA3-41BAD3DED1D7"/>
<c:set var="NutritionDischargedWorkflowState" value="7988D58A-94B1-4E5F-8891-300F40D50D5B"/>
<c:set var="NutritionDefaultedWorkflowState" value="9144608D-BE07-42E0-B9C3-7BF7B2E70B4B"/>
<c:set var="NutritionDiedWorkflowState" value="51E67592-5751-491B-8DA5-D5737D320AC5"/>

<c:set var="TeenClubActiveStates" value="F179C6EA-6AF7-4F66-8587-AFE23521400C,3E9BB98B-6BB0-431D-BCD5-B3E277922C04"/>
<c:set var="TeenClubTerminalStates" value="BDAF0BE3-5135-423E-B22B-4A87DE3C5C4A,3700B846-6F87-454A-AB1C-1EB19BF0D48B,11DFAE63-7185-452B-9BE4-E0773AC91D34,051AB431-5F98-4351-A541-9EFE0829AE7C,BFB0D25A-96C7-44EB-B58A-8CA6DCDE36D8,E6C1B44A-8B02-4D47-944D-09A2E94D61F3"/>


<c:set var="PccOnTreatmentWorkflowState" value="7c1f852e-5120-4371-8136-f64614f5dfc7"/>
<c:set var="PccTreatmentStoppedWorkflowState" value="b35ed57c-7d54-4795-b678-f0947a135fda"/>
<c:set var="PccTransferedOutWorkflowState" value="e92017b9-45cf-41b9-bc69-a5b0232544c1"/>
<c:set var="PccDefaultedWorkflowState" value="0f034ef4-3f70-4514-a020-5fb928fc3394"/>
<c:set var="PccDiedWorkflowState" value="4bed1c08-1fe9-4972-8e7e-e93323c9f2c4"/>
<c:set var="ChronicCareActiveStates" value="66882650-977f-11e1-8993-905e29aff6c1,7c4d2e56-c8c2-11e8-9bc6-0242ac110001"/>
<c:set var="ChronicCareTerminalStates" value="6688275e-977f-11e1-8993-905e29aff6c1,6688297a-977f-11e1-8993-905e29aff6c1,3a4eb919-b942-4c9c-ba0e-defcebe5cd4b,dbe76d47-dbc4-4608-a578-97b6b62d9f63"/>
<c:set var="MHProgramWokflows" value="26FD314D-138F-4A5C-8890-E01791C06336,DA69BBCB-01FE-4C59-9D46-8A2659ABBD73"/>
<c:set var="MentalHealthActiveStates" value="5925718D-EA5E-43EB-9AE2-1CB342D8E318,E0381FF3-2976-41F0-B853-28E842400E84,2F76D426-56A9-4651-B253-A2299B442C09,79F2CAB1-E674-433E-AF42-447678FDB443"/>
<c:set var="CCProgramWokflows" value="1A6C2438-99D7-41FF-8EB4-516DFCD1D199,4eda02b2-48ca-47dc-9166-483a6499bcbd,9b571347-8dc3-40fe-9994-e82071fa8290,cc76c7c2-8760-4ff6-8ed7-617a7378915b,62481c50-155c-45be-b4e9-39a38a9cbfda,319838b7-23cb-4e04-9b36-ad1e83cbeaaf"/>
<c:set var="SCDActiveStates" value="C2B106C6-18B6-4342-B2E7-FAA0540E6DC2,03A8A8DF-E95E-4875-B730-2D3CD86502EF"/>
<c:set var="SCDTreatmentDischargedWorkflowState" value="A3EA7AD8-FB32-4567-A19E-C3F6E9E33C7B"/>
<c:set var="SCDTreatmentStoppedWorkflowState" value="15072B28-46E9-412D-BCA4-3C96803C15AD"/>
<c:set var="SCDPatientDiedWorkflowState" value="5E228F5D-BA90-4F25-9524-E79ABAEFA01F"/>
<c:set var="SCDTransferredOutWorkflowState" value="A843A2AE-FB7B-48B2-A5C2-73A82890D709"/>
<c:set var="SCDPatientDefaultedWorkflowState" value="E850CEB4-B01B-47E0-AED2-4BAB1EE2A645"/>
<c:set var="CKDActiveStates" value="908552d7-2bb3-4e4f-9ba1-ec22c2c3f2b6,c5ddd2d0-33f3-4d1e-8f7d-f58beec5ece9"/>
<c:set var="CHFActiveStates" value="3a9724e5-fc65-4a48-8d0b-2b1265106552,b002c86b-e22c-484a-a9a5-a12543b4a1b1"/>
<c:set var="DIABETESHYPERTENSIONActiveStates" value="d5d2d3bf-9cca-4a1f-9c69-f7713ed8fff4,00be3c91-ecd2-482e-8c7a-7bdd49c997e7"/>
<c:set var="NCDOTHERActiveStates" value="cfec993e-ae2f-4f16-bea5-4bd26752bc89,05865dda-5934-4fcd-93eb-3d149edbdba0"/>
<c:set var="ASTHMASTATEActiveStates" value="7f2fc125-f9bc-4195-b879-3060a386468a,8f395143-5f5a-4171-8e10-aef931e16bcf"/>
<c:set var="EpilepsyActiveStates" value="5925718D-EA5E-43EB-9AE2-1CB342D8E318,E0381FF3-2976-41F0-B853-28E842400E84,CB86C6FE-4263-4A4C-AF54-49D5308459D4,61190A43-95FF-4C84-8A3F-DD7F5354171C"/>
<c:set var="MHTreatmentDischargedWorkflowState" value="42ACC789-C2BB-4EAA-8AC2-0BE7D0F5D4E8"/>
<c:set var="MHTreatmentStoppedWorkflowState" value="9F6F188C-42AB-45D8-BC8B-DBE78948072D"/>
<c:set var="MHPatientDiedWorkflowState" value="D79B02C2-B473-47F1-A51C-6D40B2242B9C"/>
<c:set var="MHTransferredOutWorkflowState" value="41AF39C1-7CE6-47E0-9BA7-9FD7C0354C12"/>
<c:set var="MHPatientDefaultedWorkflowState" value="19CEF51A-0823-4876-A8AF-7285B7077494"/>
<c:set var="PdcActiveStates" value="b84735a5-82ae-4e3b-87db-250c43113977,28f67846-3204-4dc5-9c7f-043acc3e4b6c"/>
<c:set var="PdcTreatmentDischargedWorkflowState" value="38c0cc2f-eeda-4bf3-8496-4bb11736021e"/>
<c:set var="PdcTreatmentStoppedWorkflowState" value="4c03e13a-4372-42f5-bbb1-ac0bf77c233b"/>
<c:set var="PdcPatientDiedWorkflowState" value="7451d3db-2400-4d38-b981-133dabf1558e"/>
<c:set var="PdcTransferredOutWorkflowState" value="4b2027c3-f6a1-4cdd-81c3-a6c2068ef9a9"/>
<c:set var="PdcPatientDefaultedWorkflowState" value="49853073-c864-4421-8ba4-41bb743107bd"/>
<c:set var="diagnosis" value="656292d8-977f-11e1-8993-905e29aff6c1"/>
<c:set var="developmentalDelay" value="76e0ba08-d931-4baf-9651-9946543cc623,1be62437-3093-4530-b4ab-1cd4626b9704"/>
<c:set var="trisomy21" value="fc4bf95c-b445-44e3-959b-435145e79f01"/>
<c:set var="cleftLipPalate" value="c415db67-75e8-4077-a0f2-ba2864ae52b1,abe71d88-3f2c-4380-854b-c49b74946a01"/>
<c:set var="otherDiagnosis" value="6575742a-977f-11e1-8993-905e29aff6c1,26071668-6ad4-4d30-b661-a7a07cece1ac,657169d4-977f-11e1-8993-905e29aff6c1,a94e5963-f6b1-4c91-b676-48dfb370a1f8,6575742a-977f-11e1-8993-905e29aff6c1,f541084c-84c7-48a6-b502-d9ddbb3bb3b9,6562c316-977f-11e1-8993-905e29aff6c1,6546938a-977f-11e1-8993-905e29aff6c1"/>
<c:set var="TbActiveStates" value="5088F779-AD8D-4EEF-A504-9B5C2D96ED62,77DCD910-2E24-4ECD-B71F-EBCA67F02478"/>
<c:set var="TbPatientDiedWorkflowState" value="B0EE543D-42D5-48BC-8D20-3FF6AF93FC9B"/>

<openmrs:globalProperty key="pihmalawi.showOldChronicCareCard" var="showOldChronicCareCard" defaultValue="true"/>
<openmrs:globalProperty key="pihmalawi.upperOrLowerNeno" var="upperOrLowerNeno" defaultValue="UPPER_NENO"/>

<table cellspacing="0" cellpadding="2">
<c:forEach var="program" items="${model.patientPrograms}">
    <c:if test="${!program.voided && program.program.name == 'Teen club program'}">
        <c:set var="participatedInTeenClubProgram" value="true"/>
        <c:if test="${program.dateCompleted == null}">
            <c:set var="activeTeenClubProgram" value="true"/>
        </c:if>
    </c:if>
    <c:if test="${!program.voided && program.program.name == 'HIV PROGRAM'}">
        <c:set var="activeHIVProgram" value="true"/>
    </c:if>
</c:forEach>
<openmrs:hasPrivilege privilege="View clinical data">

    <tr>
        <td>ART Patient Card:</td>
        <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="ART eMastercard" initialEncounterType="ART_INITIAL" followupEncounterType="ART_FOLLOWUP" patientIdentifierType="ARV Number" programWorkflowStates="6687fa7c-977f-11e1-8993-905e29aff6c1"/></td>
    </tr>
        <c:set var="artInitialEncounter" value="" />
        <openmrs:forEachEncounter encounters="${model.patientEncounters}"
                                  type="9" num="1" var="enc">
            <c:if test="${ not empty enc }">
                <c:set var="artInitialEncounter" value="true" />
            </c:if>
        </openmrs:forEachEncounter>
    <tr>
        <td><br /></td>
    </tr>
    <!-- If patient is eligible to be enrolled in the Teen Club or the patient is already enrolled-->
    <c:if test="${(model.patient.age > 5 && model.patient.age < 30 && activeHIVProgram == 'true') || (participatedInTeenClubProgram == 'true')}">
    <tr>
        <td>Teen Club Record:</td>
        <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="Teen Club eMastercard" initialEncounterType="TEEN_CLUB_INITIAL" followupEncounterType="TEEN_CLUB_FOLLOWUP" patientIdentifierType="ARV Number" programWorkflowStates="${TeenClubActiveStates}"/></td>
    </tr>
    <tr>
        <td><br /></td>
    </tr>
    </c:if>
    <tr>
        <td>Pre-ART Patient Card:</td>
        <c:choose>
            <c:when test="${ not empty artInitialEncounter }">
                <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="Pre-ART eMastercard" initialEncounterType="PART_INITIAL" followupEncounterType="PART_FOLLOWUP" patientIdentifierType="HCC Number" programWorkflowStates="6687f284-977f-11e1-8993-905e29aff6c1" readonly="true"/> (Readonly: ART Initial Encounter)</td>
            </c:when>
            <c:otherwise>
                <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="Pre-ART eMastercard" initialEncounterType="PART_INITIAL" followupEncounterType="PART_FOLLOWUP" patientIdentifierType="HCC Number" programWorkflowStates="6687f284-977f-11e1-8993-905e29aff6c1"/></td>
            </c:otherwise>
        </c:choose>
    </tr>
    <tr>
        <td><br /></td>
    </tr>
    <tr>
        <c:set var="artInitialEncounter" value="" />
        <openmrs:forEachEncounter encounters="${model.patientEncounters}" type="9" num="1" var="enc">
            <c:if test="${ not empty enc }">
                <c:set var="artInitialEncounter" value="true" />
            </c:if>
        </openmrs:forEachEncounter>
        <td>Exposed Child Patient Card:</td>
        <c:choose>
            <c:when test="${ not empty artInitialEncounter }">
                <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="Exposed Child eMastercard" initialEncounterType="EXPOSED_CHILD_INITIAL" followupEncounterType="EXPOSED_CHILD_FOLLOWUP" patientIdentifierType="HCC Number" programWorkflowStates="668847a2-977f-11e1-8993-905e29aff6c1" readonly="true"/> (Readonly: ART Initial Encounter)</td>
            </c:when>
            <c:otherwise>
                <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="Exposed Child eMastercard" initialEncounterType="EXPOSED_CHILD_INITIAL" followupEncounterType="EXPOSED_CHILD_FOLLOWUP" patientIdentifierType="HCC Number" programWorkflowStates="668847a2-977f-11e1-8993-905e29aff6c1"/></td>
            </c:otherwise>
        </c:choose>
    </tr>
    <tr>
        <td><br /></td>
    </tr>
    <tr>
        <td>Chronic Care Record:</td>
        <c:if test="${showOldChronicCareCard == 'true'}">
            <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="Chronic Care eMastercard" initialEncounterType="CHRONIC_CARE_INITIAL" followupEncounterType="CHRONIC_CARE_FOLLOWUP" patientIdentifierType="Chronic Care Number" programWorkflowStates="${ChronicCareActiveStates}"/></td>
        </c:if>
        <c:if test="${showOldChronicCareCard != 'true'}">
            <td>&NonBreakingSpace;</td>
        </c:if>
    </tr>
    <tr>
        <td>&NonBreakingSpace;</td>
        <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="Hypertension and Diabetes eMastercard" initialEncounterType="DIABETES HYPERTENSION INITIAL VISIT" followupEncounterType="DIABETES HYPERTENSION FOLLOWUP" programWorkflowStates="${DIABETESHYPERTENSIONActiveStates}" patientIdentifierType="Chronic Care Number"/></td>
    </tr>
    <tr>
        <td>&NonBreakingSpace;</td>
        <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="Chronic Lung Disease eMastercard" initialEncounterType="ASTHMA_INITIAL" followupEncounterType="ASTHMA_FOLLOWUP" programWorkflowStates="${ASTHMASTATEActiveStates}" patientIdentifierType="Chronic Care Number"/></td>
    </tr>
    <tr>
        <td>&NonBreakingSpace;</td>
        <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="Cardiac and Vascular Disease eMastercard" initialEncounterType="CHF_INITIAL" followupEncounterType="CHF_FOLLOWUP" programWorkflowStates="${CHFActiveStates}" patientIdentifierType="Chronic Care Number"/></td>
    </tr>
    <tr>
        <td>&NonBreakingSpace;</td>
        <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="Chronic Kidney Disease eMastercard" initialEncounterType="CKD_INITIAL" followupEncounterType="CKD_FOLLOWUP" programWorkflowStates="${CKDActiveStates}" patientIdentifierType="Chronic Care Number"/></td>
    </tr>
    <!-- uncomment this when all related Sickle cell disease forms are complete MLW-1568 -->
    <tr>
        <td>&NonBreakingSpace;</td>
        <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="Sickle Cell Disease eMastercard" initialEncounterType="SICKLE_CELL_DISEASE_INITIAL" followupEncounterType="SICKLE_CELL_DISEASE_FOLLOWUP" programWorkflowStates="${SCDActiveStates}" patientIdentifierType="Chronic Care Number"/></td>
    </tr>

    <tr>
        <td>&NonBreakingSpace;</td>
        <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="NCD Other eMastercard" initialEncounterType="NCD_OTHER_INITIAL" followupEncounterType="NCD_OTHER_FOLLOWUP" programWorkflowStates="${NCDOTHERActiveStates}" patientIdentifierType="Chronic Care Number"/></td>
    </tr>

    <tr>
        <td><br /></td>
    </tr>

    <tr>
        <td>Mental Health Record:</td>
        <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="Mental Health eMastercard" initialEncounterType="MENTAL_HEALTH_INITIAL" followupEncounterType="MENTAL_HEALTH_FOLLOWUP" programWorkflowStates="${MentalHealthActiveStates}" patientIdentifierType="Chronic Care Number"/></td>
    </tr>
    <tr>
        <td>&NonBreakingSpace;</td>
        <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="Epilepsy eMastercard" initialEncounterType="EPILEPSY_INITIAL" followupEncounterType="EPILEPSY_FOLLOWUP" programWorkflowStates="${EpilepsyActiveStates}" patientIdentifierType="Chronic Care Number"/></td>
    </tr>
    <tr>
        <td><br /></td>
    </tr>
    <tr>
        <td>Pediatric Development Clinic Record:</td>
        <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="PDC eMastercard" initialEncounterType="PDC_INITIAL" programWorkflowStates="${PdcActiveStates}" patientIdentifierType="PDC Identifier"/></td>
    </tr>
    <tr>
        <td>&NonBreakingSpace;</td>
        <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="PDC Developmental Delay eMastercard" initialEncounterType="PDC_DEVELOPMENTAL_DELAY_INITIAL" followupEncounterType="PDC_DEVELOPMENTAL_DELAY_FOLLOWUP" programWorkflowStates="${PdcActiveStates}" patientIdentifierType="PDC Identifier" condition="${diagnosis}" conditionAnswer="${developmentalDelay}"/></td>
    </tr>
    <tr>
        <td>&NonBreakingSpace;</td>
        <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="PDC Trisomy eMastercard" initialEncounterType="PDC_TRISOMY21_INITIAL" followupEncounterType="PDC_TRISOMY21_FOLLOWUP" programWorkflowStates="${PdcActiveStates}" patientIdentifierType="PDC Identifier" condition="${diagnosis}" conditionAnswer="${trisomy21}"/></td>
    </tr>
    <tr>
        <td>&NonBreakingSpace;</td>
        <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="PDC Cleft Lip / Palate eMastercard" initialEncounterType="PDC_CLEFT_CLIP_PALLET_INITIAL" followupEncounterType="PDC_CLEFT_CLIP_PALLET_FOLLOWUP" programWorkflowStates="${PdcActiveStates}" patientIdentifierType="PDC Identifier" condition="${diagnosis}" conditionAnswer="${cleftLipPalate}"/></td>
    </tr>
        <tr>
            <td>&NonBreakingSpace;</td>
            <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="PDC Other Diagnosis eMastercard" initialEncounterType="PDC_OTHER_DIAGNOSIS_INITIAL" followupEncounterType="PDC_OTHER_DIAGNOSIS_FOLLOWUP" programWorkflowStates="${PdcActiveStates}" patientIdentifierType="PDC Identifier" condition="${diagnosis}" conditionAnswer="${otherDiagnosis}"/></td>
        </tr>
    <tr>
        <td><br /></td>
    </tr>

    <tr>
        <td>Palliative Care Record:</td>
            <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="Palliative Care Mastercard" initialEncounterType="PALLIATIVE_INITIAL" followupEncounterType="PALLIATIVE_FOLLOWUP" programWorkflowStates="${PccOnTreatmentWorkflowState}" patientIdentifierType="Palliative Care Number"/></td>
    </tr>
    <tr>
        <td><br /></td>
    </tr>

    <tr>
        <td>Tuberculosis Record:</td>
        <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="TB eMastercard" initialEncounterType="TB_INITIAL" followupEncounterType="TB_FOLLOWUP" programWorkflowStates="${TbActiveStates}" patientIdentifierType="TB program identifier"/></td>
    </tr>
    <tr>
        <td><br /></td>
    </tr>
    <tr>
        <openmrs:forEachEncounter encounters="${model.patientEncounters}" type="24" num="1" var="enc">
            <c:if test="${ not empty enc }">
                <c:set var="ctEncounter" value="true" />
            </c:if>
        </openmrs:forEachEncounter>
        <openmrs:forEachEncounter encounters="${model.patientEncounters}" type="17" num="1" var="enc">
            <c:if test="${ not empty enc }">
                <c:set var="evaluationEncounter" value="true" />
            </c:if>
        </openmrs:forEachEncounter>
        <td>Kaposis Sarcoma Flowsheet:</td>
        <openmrs:hasPrivilege privilege="Edit Patients">
            <c:choose>
                <c:when test="${ evaluationEncounter || ctEncounter }">
                    <c:set var="eMastercardFormId" value="62" />
                    <td><a href="${pageContext.request.contextPath}/htmlformentryui/htmlform/flowsheet.page?headerForm=pihmalawi:htmlforms/ks_header.xml&flowsheets=pihmalawi:htmlforms/ks_eval.xml&flowsheets=pihmalawi:htmlforms/ks_chemo.xml&dashboardUrl=legacyui&patientId=${patientId}&requireEncounter=false">Edit KS file</a></td>
                </c:when>
                <c:otherwise>
                    <c:set var="eMastercardFormId" value="62" />
                    <td><a href="${pageContext.request.contextPath}/htmlformentryui/htmlform/flowsheet.page?headerForm=pihmalawi:htmlforms/ks_header.xml&flowsheets=pihmalawi:htmlforms/ks_eval.xml&flowsheets=pihmalawi:htmlforms/ks_chemo.xml&dashboardUrl=legacyui&patientId=${patientId}&requireEncounter=false">Create new KS file</a></td>
                </c:otherwise>
            </c:choose>
        </openmrs:hasPrivilege>
        <openmrs:hasPrivilege privilege="Edit Patients" inverse="true">
            <td>Not available: User does not have privileges to edit patient</td>
        </openmrs:hasPrivilege>
    </tr>
</openmrs:hasPrivilege>
    <tr>
        <td><br /></td>
    </tr>
    <tr>
        <td>Nutrition Record:</td>
        <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="Nutrition eMastercard" initialEncounterType="NUTRITION_INITIAL" followupEncounterType="NUTRITION_FOLLOWUP" programWorkflowStates="${NutritionActiveStates}" patientIdentifierType="Nutrition Program Number"/></td>
    </tr>

    <tr>
        <td>&NonBreakingSpace;</td>
        <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="Nutrition Adults eMastercard" initialEncounterType="NUTRITION_ADULTS_INITIAL" followupEncounterType="NUTRITION_ADULTS_FOLLOWUP" programWorkflowStates="${NutritionActiveStates}" patientIdentifierType="Nutrition Program Number"/></td>
    </tr>

    <tr>
        <td>&NonBreakingSpace;</td>
        <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="Nutrition Infant eMastercard" initialEncounterType="NUTRITION_INFANT_INITIAL" followupEncounterType="NUTRITION_INFANT_FOLLOWUP" programWorkflowStates="${NutritionActiveStates}" patientIdentifierType="Nutrition Program Number"/></td>
    </tr>

    <tr>
        <td>&NonBreakingSpace;</td>
        <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="Nutrition PDC eMastercard" initialEncounterType="NUTRITION_PDC_INITIAL" followupEncounterType="NUTRITION_PDC_FOLLOWUP" programWorkflowStates="${NutritionActiveStates}" patientIdentifierType="Nutrition Program Number"/></td>
    </tr>

    <tr>
        <td>&NonBreakingSpace;</td>
        <td><pihmalawi:eMastercardAccess patientId="${model.patientId}" form="Nutrition Pregnant Teens eMastercard" initialEncounterType="NUTRITION_PREGNANT_TEENS_INITIAL" followupEncounterType="NUTRITION_PREGNANT_TEENS_FOLLOWUP" programWorkflowStates="${NutritionActiveStates}" patientIdentifierType="Nutrition Program Number"/></td>
    </tr>

</table>
</div> <!-- end <div class="portlet" id="pihmalawi.malawiPatientDashboard">-->
</div> <!-- end <div class="box">-->
<br />

<openmrs:hasPrivilege privilege="View clinical data">
    <div class="boxHeader${model.patientVariation}"><openmrs:message code="pihmalawi.trace.sectionTitle" /></div>
    <div class="box${model.patientVariation}"><openmrs:message code="" />
        <div class="portlet" id="pihmalawi.trace">
            <table cellspacing="0" cellpadding="2">
                <tr>
                    <td>Trace Record:</td>
                    <td><pihmalawi:eTraceAccess patientId="${model.patientId}" form="Trace Mastercard" initialEncounterType="TRACE_INITIAL" followupEncounterType="TRACE_FOLLOWUP" /></td>
                </tr>
            </table>
        </div>
    </div>
    <br />
</openmrs:hasPrivilege>

<div class="boxHeader${model.patientVariation}"><openmrs:message code="pihmalawi.quickprograms.sectionTitle" /></div>
<div class="box${model.patientVariation}"><openmrs:message code="" />
<div class="portlet" id="pihmalawi.quickPrograms">
<table cellspacing="0" cellpadding="2">
    <openmrs:hasPrivilege privilege="View clinical data">
    <tr>
        <td style="vertical-align: top;">HIV Program:</td>
        <td><pihmalawi:quickPrograms patientId="${model.patientId}" initialStateIds="668847a2-977f-11e1-8993-905e29aff6c1,6687fa7c-977f-11e1-8993-905e29aff6c1" stateIds="6687fa7c-977f-11e1-8993-905e29aff6c1" terminalStateIds="6687f50e-977f-11e1-8993-905e29aff6c1,6687fff4-977f-11e1-8993-905e29aff6c1,668846d0-977f-11e1-8993-905e29aff6c1"/><br /></td>
    </tr>
    <c:if test="${(model.patient.age > 5 && model.patient.age < 30 && activeHIVProgram == 'true') || (activeTeenClubProgram == 'true')}">
    <tr>
        <td style="vertical-align: top;">Teen Club:</td>
        <td><pihmalawi:quickPrograms patientId="${model.patientId}" initialStateIds="${TeenClubActiveStates}" stateIds="${TeenClubActiveStates}" terminalStateIds="${TeenClubTerminalStates}"/><br /></td>
    </tr>
    </c:if>
    <tr>
        <td style="vertical-align: top;">Chronic Care Program:</td>

        <td><pihmalawi:quickPrograms patientId="${model.patientId}" workflowIds="${CCProgramWokflows}" initialStateIds="${ChronicCareActiveStates}" stateIds="${ChronicCareActiveStates}" terminalStateIds="${ChronicCareTerminalStates}"/><br /></td
    </tr>
    <tr>
        <td style="vertical-align: top;">Mental Health Program:</td>
        <td><pihmalawi:quickPrograms patientId="${model.patientId}" workflowIds="${MHProgramWokflows}" initialStateIds="${MentalHealthActiveStates}" stateIds="${MentalHealthActiveStates}" terminalStateIds="${MHTreatmentDischargedWorkflowState},${MHTreatmentStoppedWorkflowState},${MHPatientDiedWorkflowState},${MHTransferredOutWorkflowState},${MHPatientDefaultedWorkflowState}"/><br /></td
    </tr>
    <tr>
        <td style="vertical-align: top;">Pediatric Development Clinic Program:</td>
        <td><pihmalawi:quickPrograms patientId="${model.patientId}" initialStateIds="${PdcActiveStates}" stateIds="${PdcActiveStates}" terminalStateIds="${PdcTreatmentDischargedWorkflowState},${PdcTreatmentStoppedWorkflowState},${PdcPatientDiedWorkflowState},${PdcTransferredOutWorkflowState},${PdcPatientDefaultedWorkflowState}"/><br /></td
    </tr>
    <tr>
        <td style="vertical-align: top;">Palliative Care Program:</td>
        <td><pihmalawi:quickPrograms patientId="${model.patientId}" initialStateIds="${PccOnTreatmentWorkflowState}" terminalStateIds="${PccTreatmentStoppedWorkflowState},${PccTransferedOutWorkflowState},${PccDefaultedWorkflowState},${PccDiedWorkflowState}"/><br /></td>
    </tr>
    <tr>
        <td style="vertical-align: top;">TB Program:</td>
        <td><pihmalawi:quickPrograms patientId="${model.patientId}" initialStateIds="${TbActiveStates}" terminalStateIds="${TbPatientDiedWorkflowState}"/><br /></td>
    </tr>
    </openmrs:hasPrivilege>

    <tr>
        <td style="vertical-align: top;">Nutrition Program:</td>
        <td><pihmalawi:quickPrograms patientId="${model.patientId}" initialStateIds="${NutritionActiveStates}" stateIds="${NutritionActiveStates}" terminalStateIds="${NutritionTreatmentStoppedWorkflowState},${NutritionTransferedOutWorkflowState},${NutritionDischargedWorkflowState},${NutritionDefaultedWorkflowState},${NutritionDiedWorkflowState}"/><br /></td>
    </tr>
</table>
<!-- <div class="portlet"> is automatically close by openmrs:portlet  from patientOverview.jsp-->
<!-- <div class="box"> is automatically close by openmrs:extensionPoint  from patientOverview.jsp-->
