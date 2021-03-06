const fs = require('fs');
const os = require('os');
const ncp = require('ncp').ncp;
const chalk = require('chalk');
const rimraf = require('rimraf');
const childProccess = require('child_process');
const BaseGenerator = require('generator-jhipster/generators/generator-base');
const packagejs = require('../../package.json');
const Frameworks = require('./src/frameworks/frameworks');
const PromptBuilder = require('./src/prompt-builder');
const createWrapperConfig = require('./src/config-wrapper-generator');
const { Framework, Constants } = require('./src/models');
const { DefaultConfigReader, MavenConfigReader, NodeConfigReader } = require('./src/config-reader');
// const jhipsterConstants = require('generator-jhipster/generators/generator-constants');

require.extensions['.njk'] = (module, filename) => {
    module.exports = fs.readFileSync(filename, 'utf8');
};

module.exports = class extends BaseGenerator {
    get initializing() {
        return {
            init(args) { },

            readConfig() {
                this.jhipsterAppConfig = this.getAllJhipsterConfig();
                if (!this.jhipsterAppConfig) {
                    this.error('Não foi possível ler o arquivo .yo-rc.json');
                }
            },

            displayLogo() {
                this.printSeniorFswLogo();
            }
        };
    }

    prompting() {
        const promptsFramework = [{
            type: 'list',
            name: 'javaFramework',
            message: 'Qual é o framework usado no projeto?',
            choices: [{
                value: Framework.SPRING_BOOT,
                name: 'Spring Boot'
            }, {
                value: Framework.JSPARE,
                name: 'Vert.x + Jspare'
            }]
        }];

        const done = this.async();
        this.prompt(promptsFramework).then((setupProps) => {
            this.frameworkConfig = Frameworks.getConfig(setupProps.javaFramework);

            this._readConfigurationFromProject().then((projectDefaults) => {
                const prompts = new PromptBuilder(this.frameworkConfig)
                    .withDefaultValues(projectDefaults)
                    .withDefaultValues(this.frameworkConfig.defaults())
                    .build();

                this.prompt(prompts).then((props) => {
                    this.appProps = Object.assign(setupProps, props);
                    done();
                });
            });
        });
    }

    writing() {
        this.log('Gerando o wrapper...');
    }

    install() {
        const done = this.async();
        new Promise((resolve, reject) => {
            this.log(chalk.grey(`Removendo conteúdo do diretório ${Constants.FOLDER_WRAPPER}...`));
            rimraf(Constants.FOLDER_WRAPPER, (error) => {
                if (error) {
                    reject(`Não foi possível remover o diretório ${fs.realpathSync(Constants.FOLDER_WRAPPER)}. Por favor, tente remover manualmente.\nCausa: ${error}`);
                } else {
                    const projectWrapperDir = this.destinationPath(Constants.FOLDER_WRAPPER);
                    const generatorWrapperDir = this.templatePath('yajsw');

                    this.log(chalk.grey('Copiando os arquivos do wrapper...'));
                    ncp(generatorWrapperDir, projectWrapperDir, error => (error ? reject(error) : resolve()));
                }
            });
        })
            .then(() => this._createGitIgnore())
            .then(() => {
                this.log(chalk.grey('Gerando configurações...'));
                const wrapperConfig = createWrapperConfig(this.frameworkConfig, this.appProps);
                fs.writeFileSync(`${Constants.FOLDER_WRAPPER}/conf/wrapper.conf`, wrapperConfig.fileContent);

                if (wrapperConfig.jarPath) {
                    this.log(chalk.grey('Copiando jar...'));
                    fs.copyFileSync(wrapperConfig.jarPath, `${Constants.FOLDER_WRAPPER}/lib/${Constants.APP_JAR_NAME}`);
                }

                this.frameworkConfig.install(wrapperConfig, this.appProps)
                    .then(() => {
                        this._installService();
                        this._printSuccessMessage();
                        done();
                    }).catch(this._errorHandler('Falha ao instalar configurações específicas do Framework.'));
            }).catch(this._errorHandler('Falha ao copiar arquivos do wrapper.'));
    }

    _createGitIgnore() {
        fs.writeFileSync(`${Constants.FOLDER_WRAPPER}/.gitignore`, '*');
    }

    _installService() {
        if (this.appProps.installService) {
            this.log(chalk.grey('Instalando o serviço...'));
            console.log(Constants.CONSOLE_COLOR_GREY); // eslint-disable-line no-console
            if (/win/.test(os.platform())) {
                childProccess.execSync(`${Constants.FOLDER_WRAPPER}\\bat\\installService.bat`);
            } else {
                childProccess.execSync('./bin/installService.sh');
            }
            console.log(Constants.CONSOLE_COLOR_RESET); // eslint-disable-line no-console
        }
    }

    _errorHandler(msg) {
        return (error) => {
            this.error(error);
            throw new Error(msg, error);
        };
    }

    end() {
        this.log(`Fim do ${Constants.TITLE}.`);
    }

    _readConfigurationFromProject() {
        const pomXml = 'pom.xml';
        const packageJson = 'package.json';

        let configReader;
        if (fs.existsSync(pomXml)) {
            this.projectType = 'MAVEN';
            configReader = new MavenConfigReader(pomXml);
        } else if (fs.existsSync(packageJson)) {
            this.projectType = 'NODE';
            configReader = new NodeConfigReader(packageJson);
        } else {
            this.projectType = 'UNKNOWN';
            configReader = new DefaultConfigReader();
        }

        return configReader.read()
            .catch((error) => {
                this.error(`${error.message}${error.error ? (` - Causa: ${error.error}`) : ''}`);
                throw error;
            });
    }

    printSeniorFswLogo() {
        this.log('\n');
        this.log(`${chalk.green('  ██████╗  ████████╗  ███╗  ██╗  ████████╗  ████████╗  ███████╗            ')}${chalk.cyan('  ████████╗   ██████╗  ██╗    ██╗')}`);
        this.log(`${chalk.green(' ██╔════╝  ██╔═════╝  ██║█╗ ██║  ╚══██╔══╝  ██╔═══██║  ██╔═══██╗           ')}${chalk.cyan('  ██╔═════╝  ██╔════╝  ██║    ██║')}`);
        this.log(`${chalk.green(' ╚█████╗   ██████╗    ██║╚█╗██║     ██║     ██║   ██║  ███████╔╝   ██████╗ ')}${chalk.cyan('  ██████╗    ╚█████╗   ██║ ██╗██║')}`);
        this.log(`${chalk.green('  ╚═══██╗  ██╔═══╝    ██║ ╚███║     ██║     ██║   ██║  ██╔══██║    ╚═════╝ ')}${chalk.cyan('  ██╔═══╝     ╚═══██╗  ██║ ██║██║')}`);
        this.log(`${chalk.green(' ██████╔╝  ████████╗  ██║  ╚██║  ████████╗  ████████║  ██║  ╚██╗           ')}${chalk.cyan('  ██║        ██████╔╝  █████████║')}`);
        this.log(`${chalk.green(' ╚═════╝   ╚═══════╝  ╚═╝   ╚═╝  ╚═══════╝  ╚═══════╝  ╚═╝   ╚═╝           ')}${chalk.cyan('  ╚═╝        ╚═════╝   ╚════════╝')}`);
        this.log(chalk.white.bold('\n                                             https://senior.com.br\n'));

        if (process.cwd() === this.getUserHome()) {
            this.log(chalk.red.bold('\n⚠ ALERTA ⚠  Você está em seu diretório HOME!'));
            this.log(chalk.red('Isso pode causar problemas, você sempre deve criar um novo diretório e executar o jhipster a partir deste.'));
            this.log(chalk.white(`Veja a seção de solução de problemas em ${chalk.yellow('https://www.jhipster.tech/installation/')}`));
        }

        this.log(chalk.green(' __________________________________________________________________________________________________________\n'));
        this.log(chalk.white(`  Bem-vindo ao ${Constants.TITLE} ${chalk.yellow(`v${packagejs.version}`)}!`));
        this.log(chalk.white(`  Documentação para configuração do wrapper em ${chalk.yellow('https://github.com/SeniorSA/yo-java-service-wrapper/')}`));
        this.log(chalk.green(' __________________________________________________________________________________________________________\n'));

        const moduleWorkingDir = chalk.yellow(`${process.cwd().replace(/\\/g, '/')}/${Constants.FOLDER_WRAPPER}`);
        this.log(chalk.white(`Os arquivos serão gerados em: ${moduleWorkingDir}`));
        this.log(chalk.white(`⚠ ALERTA ⚠  A pasta ${chalk.yellow(`${Constants.FOLDER_WRAPPER}`)} e todos seus arquivos serão removidos!\n`));
    }

    _printSuccessMessage() {
        this.success('Service Wrapper gerado com sucesso!!!\n');
    }
};
