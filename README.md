This represents the overall distribution and customization module for PIH Malawi

## Build PIH Malawi development environment with OpenMRS SDK

**NOTE**
The following are variables which can be modified:
```
serverId = malawi
database = openmrs_neno
source code = ~/workspace
module name = pihmalawi for openmrs-module-pihmalawi
```
### Linux instructions 

#### Install prerequisites

1. [Install Java and Maven](https://wiki.openmrs.org/display/docs/OpenMRS+SDK#OpenMRSSDK-Installation)
2. Install git
   - sudo apt-get install git
3. To setup the OpenMRS SDK, you just need to open up a terminal/console and enter:
   - mvn org.openmrs.maven.plugins:openmrs-sdk-maven-plugin:setup-sdk

##### Configure mySQL Server to work with OpenMRS
1. Edit MySQL server config file
   - On Mac OS, the config file is located at **_/etc/my.cnf_**:
    ```
   default-time-zone=-4:00
    ```
   - On Ubuntu
    ```
    default-time-zone=”America/New_York"
    ```
    - I think in Malawi the GMT offset is +2:00? 
2. Restart mysql server
3. Log on mysql server and check the time zone:
   ```
   mysql -u root -p
   SELECT @@global.time_zone;   
   ```
4. It should display something like:
   ```
   +--------------------+
   | @@global.time_zone |
   +--------------------+
   | -04:00             |
   +--------------------+
   ```    

#### Source the PIH Malawi database

Download a *de-identified* backup and source the database:
```
mysql -u root -p mysql
(enter password)

CREATE DATABASE openmrs_neno DEFAULT CHARACTER SET utf8 DEFAULT COLLATE utf8_general_ci;
GRANT ALL ON `openmrs_neno`.* TO 'openmrs'@'localhost' IDENTIFIED BY 'openmrs';

use openmrs_neno;

source *name of openmrs neno database*.sql
```

#### Install OpenMRS SDK
1. Setup source code directory
   - cd ~
   - mkdir workspace
   - cd workspace
2. Get PIH Malawi module from git
   - git clone https://github.com/PIH/openmrs-module-pihmalawi.git pihmalawi
3. Install the PIH Malawi omod in your local maven repo
    - from the directory you have PIH Malawi checked out build the pihmalawi distribution:
    ```
    mvn clean install -DskipTests -Pdistribution
    ```
4. Setup SDK
   - mvn openmrs-sdk:setup -DserverId=malawi 
   - Type '1' to setup a distribution
   - Set custom distribution = 'org.pih.openmrs:pihmalawi-distro:X-Y-Z-SNAPSHOT' (see pom.xml for current version) 
   - Set -DdbUri=jdbc:mysql://localhost:3306/openmrs_neno
   - or, just run the following command
   ```
   mvn openmrs-sdk:setup -DserverId=malawi -Ddistro=org.pih.openmrs:pihmalawi-distro:9.2.0-SNAPSHOT -DdbUri=jdbc:mysql://localhost:3306/openmrs_neno -DdbUser=openmrs -DdbPassword=openmrs
   ```

5. Install configuration
   - From the repo root, build the distro properties and push configuration only to the running
     server (replace `malawi` with your server id):
   ```
   mvn clean install -Pdistribution -DbuildDistro=true
   mvn openmrs-sdk:deploy -Ddistro=distro/target/classes/openmrs-distro.properties -DserverId=malawi -DconfigOnly=true
   ```
   Note: this is slower than the old `configuration/install.sh` (it resolves the full distro, not
   just configuration), because `distro/pom.xml`'s `build-distro` execution and its
   properties-filtering step share the same Maven phase. A lighter config-only refresh is a
   possible future improvement, not part of this change.

6. Run SDK
   - mvn openmrs-sdk:run -DserverId=malawi

## Using your local development environment

With the Chrome browser, use this URL:

> http://localhost:8080/openmrs

## Modify development environment

If you want to modify and test the PIH Malawi module, you can "watch" the the module for the "malawi" project.  You can add a module as watched by the selected server executing the openmrs-sdk:watch command in module's project directory. 
```
cd ~/workspace/pihmalawi
mvn openmrs-sdk:watch -DserverId=malawi
mvn openmrs-sdk:run -DserverId=malawi
```
## Release to maven a new version of pihmalawi module

1. Update pihmalawi code to latest from git
2. Update all (5) poms to the version you want to release (eg. change 7.0.0-SNAPSHOT to 7.0.0)
3. Build locally and confirm it builds and all of the artifacts have a version of 7.0.0
4. Commit and push
5. Here, you let the CI job run.  It will build and deploy, and because this is not a snapshot, it will go to the releases maven repository)
6. Once that has successfully finished, go back into the code and:
    - Git pull
    - Create a tag reflecting that this is the release version (eg. tag as 7.0.0)
      ```
      git tag
      git tag -a 7.0.0 -m "Release 7.0.0"
      git push origin 7.0.0
      ```
    - Update all (5) poms to the next snapshot version you want to use (eg. change 7.0.0 to 7.1.0-SNAPSHOT)
    - Build locally and confirm it builds and all of the artifacts have the right new snapshot version
    - Commit and push
   
Make sure no one is going to commit any code to the repo while you are in the middle of this process, as we don’t want any changes getting committed while the version is set to a non-snapshot version.

### Additional references

- [OpenMRS SDK](https://wiki.openmrs.org/display/docs/OpenMRS+SDK)
