using System.Security.Cryptography;
using System.Text;

namespace Splitter.Api.Ai;

public static class UuidV5
{
    public static readonly Guid DnsNamespace = Guid.Parse("6ba7b810-9dad-11d1-80b4-00c04fd430c8");

    public static Guid Create(Guid namespaceId, string name)
    {
        var namespaceBytes = namespaceId.ToByteArray();
        SwapGuidByteOrder(namespaceBytes);

        var nameBytes = Encoding.UTF8.GetBytes(name);
        var hash = SHA1.HashData(namespaceBytes.Concat(nameBytes).ToArray());

        var bytes = new byte[16];
        Array.Copy(hash, bytes, 16);
        bytes[6] = (byte)((bytes[6] & 0x0F) | 0x50);
        bytes[8] = (byte)((bytes[8] & 0x3F) | 0x80);
        SwapGuidByteOrder(bytes);
        return new Guid(bytes);
    }

    private static void SwapGuidByteOrder(byte[] guid)
    {
        Swap(guid, 0, 3);
        Swap(guid, 1, 2);
        Swap(guid, 4, 5);
        Swap(guid, 6, 7);
    }

    private static void Swap(byte[] bytes, int left, int right)
    {
        (bytes[left], bytes[right]) = (bytes[right], bytes[left]);
    }
}
