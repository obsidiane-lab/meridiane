<?php

namespace App\Command;

use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\HttpKernel\KernelInterface;

#[AsCommand(name: 'app:dev:reset', description: 'Reset database schema + migrate + seed (dev only)')]
final class DevResetCommand extends Command
{
    public function __construct(private readonly KernelInterface $kernel)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('force', null, InputOption::VALUE_NONE, 'Allow running outside dev')
            ->addOption('no-fixtures', null, InputOption::VALUE_NONE, 'Skip doctrine:fixtures:load');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $isDev = $this->kernel->getEnvironment() === 'dev';
        $force = (bool) $input->getOption('force');
        if (!$isDev && !$force) {
            $io->error('Refusing to reset DB outside dev. Use --force to override.');
            return Command::FAILURE;
        }

        $app = new Application($this->kernel);
        $app->setAutoExit(false);

        $io->section('Dropping schema (full database)');
        $code = $this->runSubCommand($app, 'doctrine:schema:drop', [
            '--force' => true,
            '--full-database' => true,
            '--no-interaction' => true,
        ], $output);
        if ($code !== 0) return $code;

        $io->section('Running migrations');
        $code = $this->runSubCommand($app, 'doctrine:migrations:migrate', [
            '--no-interaction' => true,
            '--all-or-nothing' => true,
        ], $output);
        if ($code !== 0) return $code;

        if (!(bool) $input->getOption('no-fixtures')) {
            $io->section('Loading fixtures (group: dev)');
            $code = $this->runSubCommand($app, 'doctrine:fixtures:load', [
                '--no-interaction' => true,
                '--group' => ['dev'],
            ], $output);
            if ($code !== 0) return $code;
        }

        $io->success('DB reset complete');
        return Command::SUCCESS;
    }

    private function runSubCommand(Application $app, string $name, array $args, OutputInterface $output): int
    {
        $cmd = $app->find($name);
        $in = new ArrayInput($args + ['command' => $name]);
        $in->setInteractive(false);

        return $cmd->run($in, $output);
    }
}
