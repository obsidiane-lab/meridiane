<?php

namespace App\DataFixtures;

use App\Entity\Conversation;
use App\Entity\EventLog;
use App\Entity\KeyValueConfig;
use App\Entity\Message;
use App\Entity\User;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Bundle\FixturesBundle\FixtureGroupInterface;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class DevFixtures extends Fixture implements FixtureGroupInterface
{
    public function __construct(
        private readonly UserPasswordHasherInterface $hasher,
    ) {
    }

    public static function getGroups(): array
    {
        return ['dev'];
    }

    public function load(ObjectManager $manager): void
    {
        $devUser = $this->createUser('dev@meridiane.local', 'dev', ['ROLE_USER'], 'Dev', $manager);
        $adminUser = $this->createUser('admin@meridiane.local', 'admin', ['ROLE_ADMIN'], 'Admin', $manager);

        $conv = new Conversation();
        $conv->setTitle('Sandbox conversation');
        $conv->setExternalId('sandbox-1');
        $conv->addParticipant($devUser);
        $conv->addParticipant($adminUser);
        $manager->persist($conv);

        $m1 = new Message();
        $m1->setConversation($conv);
        $m1->setAuthor($devUser);
        $m1->setOriginalText('Hello from dev');
        $m1->setMeta(['kind' => 'text', 'nullable' => null, 'tags' => ['hello', 'dev']]);
        $manager->persist($m1);

        $m2 = new Message();
        $m2->setConversation($conv);
        $m2->setAuthor($adminUser);
        $m2->setOriginalText('Hello from admin');
        $m2->setMeta(['kind' => 'text', 'reactions' => ['👍' => 1]]);
        $manager->persist($m2);

        $kv = new KeyValueConfig();
        $kv->setName('app.settings');
        $kv->setValues([
            'featureFlags' => ['mercure' => true],
            'timeoutMs' => 1200,
            'nullableExample' => null,
            'weirdKeys' => ['x-test' => true, 'foo:bar' => 'baz'],
        ]);
        $manager->persist($kv);

        $evt1 = new EventLog();
        $evt1->setName('email.demo');
        $evt1->setPayload([
            'kind' => 'email',
            'email' => 'someone@example.com',
            'subject' => 'Hello',
            'meta' => ['traceId' => 'dev', 'attempt' => 1],
        ]);
        $manager->persist($evt1);

        $evt2 = new EventLog();
        $evt2->setName('webhook.demo');
        $evt2->setPayload([
            'kind' => 'webhook',
            'url' => 'https://example.com/webhook',
            'headers' => ['X-Test' => '1'],
        ]);
        $manager->persist($evt2);

        $manager->flush();
    }

    private function createUser(string $email, string $password, array $roles, string $displayName, ObjectManager $manager): User
    {
        $u = new User();
        $u->setEmail($email);
        $u->setDisplayName($displayName);
        $u->setRoles($roles);
        $u->setPassword($this->hasher->hashPassword($u, $password));
        $manager->persist($u);
        return $u;
    }
}

