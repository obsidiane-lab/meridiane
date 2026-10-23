<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\Conversation;
use App\Entity\Message;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(name: 'app:seed', description: 'Ajoute les conversations de démonstration si la base est vide.')]
final class SeedCommand extends Command
{
    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        if ($this->entityManager->getRepository(Conversation::class)->count([]) > 0) {
            $output->writeln('Les conversations existent déjà, aucune donnée modifiée.');

            return Command::SUCCESS;
        }

        $conversation = (new Conversation())->setTitle('Bienvenue dans le playground Meridiane');
        foreach (['Les relations sont chargées à la demande par leur IRI.', 'Ouvrez deux onglets pour vérifier les mises à jour Mercure.'] as $content) {
            $conversation->addMessage((new Message())->setContent($content));
        }

        $this->entityManager->persist($conversation);
        $this->entityManager->flush();
        $output->writeln('Une conversation et deux messages créés.');

        return Command::SUCCESS;
    }
}
