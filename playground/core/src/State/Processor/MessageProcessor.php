<?php

declare(strict_types=1);

namespace App\State\Processor;

use ApiPlatform\Metadata\DeleteOperationInterface;
use ApiPlatform\Metadata\IriConverterInterface;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\Metadata\UrlGeneratorInterface;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Conversation;
use App\Entity\Message;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Mercure\HubInterface;
use Symfony\Component\Mercure\Update;
use Symfony\Component\Serializer\SerializerInterface;

/** @implements ProcessorInterface<Message, Message|null> */
final readonly class MessageProcessor implements ProcessorInterface
{
    public function __construct(
        /** @var ProcessorInterface<Message, Message> */
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persistProcessor,
        /** @var ProcessorInterface<Message, void> */
        #[Autowire(service: 'api_platform.doctrine.orm.state.remove_processor')]
        private ProcessorInterface $removeProcessor,
        private IriConverterInterface $iriConverter,
        private SerializerInterface $serializer,
        private HubInterface $hub,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): ?Message
    {
        $conversation = $data->getConversation();
        $previous = $context['previous_data'] ?? null;
        $previousConversation = $previous instanceof Message ? $previous->getConversation() : null;

        if ($operation instanceof DeleteOperationInterface) {
            $conversation?->removeMessage($data);
            $this->removeProcessor->process($data, $operation, $uriVariables, $context);
            $result = null;
        } else {
            $result = $this->persistProcessor->process($data, $operation, $uriVariables, $context);
        }

        $conversations = $conversation === null ? [] : [$conversation];
        if ($previousConversation !== null && $previousConversation !== $conversation) {
            $conversations[] = $previousConversation;
        }

        // La liste d'IRI appartient à la conversation : sa fraîcheur relève de cette application.
        foreach ($conversations as $affected) {
            $this->hub->publish(new Update(
                $this->iriConverter->getIriFromResource($affected, UrlGeneratorInterface::ABS_URL),
                $this->serializer->serialize($affected, 'jsonld', ['resource_class' => Conversation::class]),
            ));
        }

        return $result;
    }
}
